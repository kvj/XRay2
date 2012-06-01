var PendingTasks = function(config) {//Executes pending tasks with timeout
    this.config = config || {};
    this.pending = [];
    this.running = {};
    this.index = 1;
    this.tasksRunning = 0;
};

PendingTasks.prototype.incTasksRunning = function() {
    if (this.tasksRunning<=0) {
        this.tasksRunning = 1;
        if (this.config.taskStarted) {//Handler
            this.runningObject = this.config.taskStarted();
        };
    } else {
        this.tasksRunning++;
    };
};

PendingTasks.prototype.decTasksRunning = function() {
    if (this.tasksRunning<=1) {
        this.tasksRunning = 0;
        if (this.config.taskStopped) {//Handler
            this.config.taskStopped(this.runningObject);
        };
    } else {
        this.tasksRunning--;
    };
};

PendingTasks.prototype.startTask = function(task) {//Tries to execute task
    var st = 0;//Ignore task
    if (this.config.getStatus) {//Ask handler
        st = this.config.getStatus();
    };
    if (st == 0) {//Error - not a good time
        this.taskFailed(task, 'Connection is not initialized');
        return false;
    };
    if (st == 2) {//Run all pending
        this.statusChanged(st);
    };
    if (st == 1 || st == 2) {//1 or 2
        this.runTask(task, st == 1);//Pending
        return st == 2;
    };
    return false;
};

PendingTasks.prototype.taskFailed = function(task, reason) {//Call error handler
    if (this.config.error) {//Error handler
        this.config.error(task, reason);
    };
};

PendingTasks.prototype.runTask = function(task, pending) {//Execute task
    if (this.config.run) {//Run handler
        //Start timer
        var ctx = {task: task, index: this.index++};
        if (this.config.indexed) {//Save indexed
            this.running[ctx.index] = ctx;
        };
        this.incTasksRunning();
        var addTimeout = 0;
        if (pending) {//This task is pending
            this.pending.push(ctx);
        } else {//Run now
            addTimeout = this.config.run(task, ctx, ctx.index);
        };
        ctx.timeoutID = setTimeout(_.bind(function(ctx) {//Timeout reached
            ctx.failed = true;
            this.decTasksRunning();
            ctx.timeoutID = null;
            if (this.running[ctx.index]) {//Remove from running
                delete this.running[ctx.index];
            };
            this.taskFailed(ctx.task, 'Timeout reached');
        }, this), (this.config.timeout || 30)*1000+(addTimeout || 0), ctx);
    };
};

PendingTasks.prototype.indexDone = function(index, value) {//Task by index done
    if (this.running[index]) {//Found
        this.taskDone(this.running[index], value);
        delete this.running[index];
    };
};

PendingTasks.prototype.taskDone = function(ctx, value, failed) {//Task done. Stop timeout
    if (ctx && !ctx.failed) {//Valid ctx
        if (ctx.timeoutID) {//Stop timeout
            clearTimeout(ctx.timeoutID);
            ctx.timeoutID = null;
        };
        this.decTasksRunning();
        if (failed) {//Mark as failed
            ctx.failed = true;
            this.taskFailed(ctx.task, value);
        } else {//Task OK
            if (this.config.done) {//Done handler
                this.config.done(ctx.task, value);
            };
        };
    };
};

PendingTasks.prototype.statusChanged = function(st) {//Status changed, try to send
    if (st == 2 && this.config.run) {//Send all pending tasks
        while (this.pending.length>0) {
            var ctx = this.pending[0];
            this.pending.splice(0, 1);
            this.config.run(ctx.task, ctx, ctx.index);
        };
    };
};
