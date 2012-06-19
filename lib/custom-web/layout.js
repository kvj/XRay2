var Layout = function(config){
    this.conf = config || {};
    this.conf.stretch = true;
    this.initElement(this.conf, $(document.body));
    $(window).bind('resize', {instance: this}, function(e) {//Auto resize
        e.data.instance.resize();
    }).bind('load', {instance: this}, function(e) {//Resize after load
        e.data.instance.resize();
    })
};

Layout.prototype.initElement = function(element, p){
    element.selector = _.startsWith(element.id, '.')? element.id: '#'+element.id;
    var el = p.find(element.selector).css('position', 'absolute');
    var ch = element.children || [];
    for(var i = 0; i<ch.length; i++){
        this.initElement(ch[i], el);
    }
};

Layout.prototype.resize = function(){
    return this.resizeElement(this.conf, false, $(window).width(), $(window).height(), $(document.body));
}

Layout.prototype.isVisible = function(query) {
    if (!query || query.size() != 1) {//Not visible
        return false;
    };
    if (query.css('display') == 'none') {//Not visible
        return false;
    };
    return true;
};

Layout.prototype.resizeElement = function(element, horizontal, width, height, p){
    var el = p.find(element.selector);
    var sizeDec = horizontal? el.height(true)-el.height() : el.width(true)-el.width();
    if(horizontal){
        el.height(height-sizeDec);
    } else {
        el.width(width-sizeDec);
    }
    if(!this.isVisible(el))
        return {width: 0, height: 0};
    if(element.stretch){
        if(horizontal){
            el.width(width-sizeDec);
        } else {
            el.height(height-sizeDec);
        }
    } else {
        if(horizontal){
            width = el.width(true)-sizeDec;
        } else {
            height = el.height(true)-sizeDec;
        }
    }
    var ch = element.children || [];
    var nonstretch = 0;
    var stretchcount = 0;
    for(var i = 0; i<ch.length; i++){
        if(!ch[i].stretch || !this.isVisible(el.find(ch[i].selector))){
            var result = this.resizeElement(ch[i], element.horizontal, width, height, el);
            if(element.horizontal)
                nonstretch += result.width;
            else
                nonstretch += result.height;
        } else {
            stretchcount++;
        }
    }
    var swidth = width;
    var sheight = height;
    if(stretchcount>0){
        if(element.horizontal){
            nonstretch = width-nonstretch;
            swidth = Math.round(nonstretch/stretchcount);
        } else {
            nonstretch = height-nonstretch;
            sheight = Math.round(nonstretch/stretchcount);
        }
    }
    var x = 0;
    var y = 0;
    for(var i = 0; i<ch.length; i++){
        //log('move', ch[i].id, x, y);
        var child = el.find(ch[i].selector);
        child.css('left', x).css('top', y);

        if(ch[i].stretch){
            var result = this.resizeElement(ch[i], element.horizontal, swidth, sheight, el);
        }
        if(element.horizontal){
            x += !this.isVisible(child)? 0: child.width(true);
        } else {
            y += !this.isVisible(child)? 0: child.height(true);
        }
    }
    return {
        width: el.width(true),
        height: el.height(true)
    };
}
