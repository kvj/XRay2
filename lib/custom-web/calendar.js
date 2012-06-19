var Calendar = function(config){
    this.config = config || {};
    this.days = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
    this.months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.weekends = ['su', 'sa'];
    this.wk = 'wk';
    this.startWeek = this.config.startWeek || 0;
    this.date = this.config.forDate || new Date();
    this.renderTo = this.config.renderTo;
    if(this.renderTo) {
        this.renderTo.bind('mousewheel', {instance: this}, function(e){
            var direction = e.wheelDelta>0? -1: 1;
            e.data.instance.monthChanged(e.shiftKey? 12*direction: direction);
            return false;
        });
    }
    this.selected = this.config.selected || null;
    var instance = this;
    setTimeout(function () {
        instance.render();
    }, 0)
}

Calendar.prototype.reset = function(){
    this.date = new Date();
    this.today = new Date();
    this.selected = null;
    this.render();
}

Calendar.prototype.nearestStartOfWeek = function(dt){
    var shift = dt.getDay()<this.startWeek? 6-dt.getDay(): dt.getDay()-this.startWeek;
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()-shift);
};

Calendar.prototype.render = function(){
    if(!this.renderTo)
        return;
    this.today = new Date();
    var startDate = new Date(this.date.getFullYear(), this.date.getMonth(), 1);
    var endDate = new Date(this.date.getFullYear(), this.date.getMonth(), this.date.daysInMonth());
    //log('Render called '+this.date+', '+this.date.getDay()+', '+startDate.getDay()+', '+endDate.getDay());
    //Need to find nearest start day
    var startDay = 1-(startDate.getDay()<this.startWeek? 6-startDate.getDay(): startDate.getDay()-this.startWeek);
    var endDay = this.date.daysInMonth();
    if(((endDate.getDay()+1) % 7) != this.startWeek)
        endDay += (6-endDate.getDay()+this.startWeek);
    this.renderTo.empty();
    var wd = 0;
    //log('render from '+startDay+' to '+endDay);
    var nav = $('<div/>').appendTo(this.renderTo).addClass('navigation');
    //Render arrows and month name
    $('<div>'+(this.config.leftArrow || '&lt;')+'</div>').appendTo(nav).addClass('arrow leftArrow').bind('click', {origin: this}, this.onLeftArrow).css('cursor', 'pointer');
    $('<div>'+(this.config.rightArrow || '&gt;')+'</div>').appendTo(nav).addClass('arrow rightArrow').bind('click', {origin: this}, this.onRightArrow).css('cursor', 'pointer');
    var monthDiv = $(document.createElement('div')).addClass('month').text(this.months[this.date.getMonth()]);
    if (this.config.onMonthRender) {
        this.config.onMonthRender(monthDiv);
    };
    var yearDiv = $(document.createElement('div')).addClass('month').text(''+this.date.getFullYear());
    if (this.config.onYearRender) {
        this.config.onYearRender(yearDiv);
    };
    $(document.createElement('div')).appendTo(nav).addClass('month_year').bind('dblclick', {instance: this}, function(e){
        e.data.instance.date = new Date();
        e.data.instance.render();
        e.preventDefault();
        return false;
    }).append(monthDiv).append(yearDiv);
    $('<div/>').addClass('clear').appendTo(nav);
    //Render day names
    var grid = $(document.createElement('div')).addClass('calendar_grid').appendTo(this.renderTo);
    var daynames = $('<div/>').appendTo(grid).addClass('daynames days_row');
    if (this.config.week == 'left') {
        $('<div>'+this.wk+'</div>').appendTo(daynames).addClass('day week_name')
    };
    for(var i = 0; i<7; i++){
        //log('render week day '+i+', '+this.startWeek+', '+((i+this.startWeek) % 7));
        var div = $('<div>'+this.days[(i+this.startWeek) % 7]+'</div>').appendTo(daynames).addClass('day day_name');
        var isWeekend = false;
        for(id in this.weekends){
            if(this.days[(i+this.startWeek) % 7] == this.weekends[id])
                isWeekend = true;
        }
        if(isWeekend) {
            div.addClass('weekend');
        }
    }
    if (this.config.week == 'right') {
        $('<div>'+this.wk+'</div>').appendTo(daynames).addClass('day week_name')
    };
    $('<div/>').addClass('clear').appendTo(daynames);
    var week = null;
    for(var i = startDay; i<=endDay; i++){
        var dt = new Date(this.date.getFullYear(), this.date.getMonth(), i);
        if(wd == 0){
            if(week){
                $('<div/>').addClass('clear').appendTo(week);
            }
            week = $('<div/>').appendTo(grid).addClass('week days_row');
            if (this.config.week == 'left') {
                var weekDiv = $('<div>'+dt.format('ww')+'</div>').appendTo(week).addClass('day week_day')
                if (this.config.onWeekRender) {
                    this.config.onWeekRender(weekDiv, dt.getWeek());
                };
            };
        }
        var div = $('<div>'+dt.getDate()+'</div>').appendTo(week).addClass('day');
        var isWeekend = false;
        for(id in this.weekends){
            if(this.days[(wd+this.startWeek) % 7] == this.weekends[id])
                isWeekend = true;
            var hh = [];
            //log('check hh');
            for(var j in hh){
                var h = hh[j];
                var hd = new Date(h.year || this.date.getFullYear(), h.month-1, h.day);
                if(dt.isSameDate(hd))
                    isWeekend = true;
            }
        }
        if(isWeekend) {
            div.addClass('weekend');
        }
        if(dt.isSameDate(this.today)){
            div.addClass('today');
        }
        if(i<1 || i>this.date.daysInMonth()){
            div.addClass('disabled');
        } else {
            div.addClass('active');
        }
        div.css('cursor', 'pointer').bind('click', {origin: this}, this.onDateClick);
        div.data('year', dt.getFullYear()).data('month', dt.getMonth()).data('day', dt.getDate());
        if (this.config.handleDay) {
            this.config.handleDay(div, dt);
        };
        if(this.selected && this.selected.isSameDate(dt)){
            div.addClass('selected');
        }
        if(this.config.ddtarget){
            div.data(this.config.ddtarget, true);
            div.data('ddid', {
                year: this.date.getFullYear(),
                month: this.date.getMonth(),
                day: i
            });
        }
        if(wd == 6){
            wd = 0;
            if (this.config.week == 'right') {
                var weekDiv = $('<div>'+dt.format('ww')+'</div>').appendTo(week).addClass('day week_day')
                if (this.config.onWeekRender) {
                    this.config.onWeekRender(weekDiv, dt.getWeek());
                };
            };
        } else {
            wd++;
        }
    }
    $('<div/>').addClass('clear').appendTo(week);
};

Calendar.prototype.monthChanged = function(delta){
    var newDate = new Date(this.date.getFullYear(), this.date.getMonth()+delta, 1);
    var result = true;
    if(this.config.monthChanged && this.config.handler)
        result = this.config.monthChanged.call(this.config.handler, newDate.getFullYear(), newDate.getMonth);
    if(!result)
        return false;
    this.date = newDate;
    this.render();
    return false;
}

Calendar.prototype.onDateClick = function(e) {
    var cal = e.data.origin;
    var dt = new Date($(this).data('year'), $(this).data('month'), $(this).data('day'));
    if(cal.config.daySelected){
        cal.config.daySelected(dt, e);
    }
    cal.selected = dt;
    cal.render();
    return false;
}

Calendar.prototype.onLeftArrow = function(e){
    return e.data.origin.monthChanged(-1);
};

Calendar.prototype.onRightArrow = function(e){
    return e.data.origin.monthChanged(1);
};

