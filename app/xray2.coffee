class DBProvider
    constructor: (@name, @version = '1')->

    open: (clean = true, handler) ->
        handler 'open: Not implemented'

    verify: (schema, handler) ->
        handler 'Not implemented'

    query: (line, params, handler) ->
        handler 'Not implemented'

    get: (name, def) ->
        null

    is: (name, def) ->
        def ? no

    set: (name, value) ->
        null

class AirDBProvider extends DBProvider

    open: (clean = true, handler, absolute) ->
        @db = new air.SQLConnection()
        err = (event) =>
            log 'open error', event
            handler event.error.message
        @db.addEventListener air.SQLEvent.OPEN, (event) =>
            @db.removeEventListener air.SQLErrorEvent.ERROR, err
            handler null
        @db.addEventListener air.SQLErrorEvent.ERROR, err
        if absolute
            folder = air.File.applicationDirectory
        else
            folder = air.File.applicationStorageDirectory
        @dbFile = folder.resolvePath @name
        @db.openAsync @dbFile, 'create', null, false, 1024

    verify: (schema, handler) ->
        err = () =>
            log 'verify error', event
            do_reset_schema()
        do_reset_schema = () =>
            @db.removeEventListener air.SQLErrorEvent.ERROR, err
            afterClose = () =>
                if @dbFile.exists then @dbFile.deleteFile()
                @open false, (err) =>
                    if err then return handler err
                    sqlsDone = 0
                    for sql in schema
                        createStmt = new air.SQLStatement()
                        createStmt.sqlConnection = @db
                        createStmt.addEventListener air.SQLEvent.RESULT, () =>
                            if ++sqlsDone >= schema.length
                                handler null
                        createStmt.addEventListener air.SQLErrorEvent.ERROR, (event) =>
                            handler event.error.message
                        createStmt.text = sql
                        createStmt.execute()
            @db.addEventListener 'close', (event) =>
                setTimeout () =>
                    afterClose()
                , 1000
            @db.close()
        @db.addEventListener air.SQLEvent.SCHEMA, (event) =>
            tables = @db.getSchemaResult()?.tables ? []
            # log 'Schema', tables, schema, @clean
            @tables = []
            for table in tables
                # log 'Now schema:', table.name
                @tables.push table.name
            # log 'Need clean', @clean
            if @clean
                do_reset_schema()
            else
                handler null
        @db.addEventListener air.SQLErrorEvent.ERROR, err
        @db.loadSchema air.SQLTableSchema

    query: (line, params, handler) ->
        stmt = new air.SQLStatement()
        stmt.sqlConnection = @db
        stmt.addEventListener air.SQLEvent.RESULT, (event) =>
            result = stmt.getResult()
            data = []
            if not result or not result.data
                return handler null, data
            numResults = result.data.length
            for i in [0...numResults]
                row = result.data[i]
                data.push row
            handler null, data
        stmt.addEventListener air.SQLErrorEvent.ERROR, (event) =>
            handler event.error.message
        stmt.text = line
        for i in [0...params.length]
            stmt.parameters[i] = params[i]
        stmt.execute()

    get: (name, def) ->
        arr = air.EncryptedLocalStore.getItem name
        if not name then return def
        try
          return arr.readUTF()
        catch error
        return def  

    is: (name, def) ->
        arr = air.EncryptedLocalStore.getItem name
        if not name then return def ? no
        try
          return arr.readUTF()
        catch error
        return def is yes or def is 'true' or def is 'yes'

    set: (name, value) ->
        if not name then return no
        if not value
            air.EncryptedLocalStore.removeItem name
        arr = new air.ByteArray()
        arr.writeUTF(''+value)
        air.EncryptedLocalStore.setItem name, arr



yepnope({
    load: ['lib/custom-web/cross-utils.js', 'lib/common-web/jquery-1.7.2.min.js', 'lib/common-web/underscore-min.js', 'lib/common-web/underscore.strings.js', 'lib/custom-web/date.js', 'lib/common-web/json2.js', 'lib/custom-web/layout.js']
    complete: () ->
        yepnope([{
            test: CURRENT_PLATFORM == PLATFORM_AIR
            yep: ['lib/air/AIRAliases.js', 'lib/air/AIRIntrospector.js']
        }, {
            load: ['app/xray2.css']
            complete: () ->
                $(document).bind 'mobileinit', () ->
                    log 'Init done'
                    new Application()
        }, {
            load: ['lib/jqm/jquery.mobile-1.1.0.min.js', 'lib/jqm/jquery.mobile-1.1.0.min.css']
        }])
})

class Application

    wordsTimeout: 5
    wordsFont: 1.0
    wordsOnTop: no
    wordsLinesVisible: [yes, yes, yes]
    wordsCurrent: 0
    dict: []

    constructor: () ->
        @db = new AirDBProvider 'app/dict.sqlite'
        $('#main_settings').bind 'click', () =>
            $.mobile.changePage $('#dicts')
            @showDictionaries()
            no
        $('#dicts_done').bind 'click', () =>
            $.mobile.changePage $('#main'), {
                reverse: yes
            }
        $('#text_done').bind 'click', () =>
            $.mobile.changePage $('#main'), {
                reverse: yes
            }
        $('#dict_done').bind 'click', () =>
            $.mobile.changePage $('#text'), {
                reverse: yes
            }
        $('#add_word_cancel').bind 'click', () =>
            $.mobile.changePage $('#dict'), {
                reverse: yes
            }
        $('#dicts_add').bind 'click', () =>
            @showAddDictionary()
        $('#main_word_panel').bind 'click', () =>
            @showWordsPanel()
        $('#add_dict_file').bind 'click', () =>
            @showOpenFileDialog()
        @reloadDictionaries()
        $('#add_dict_save').bind 'click', () =>
            @doAddDictionary()
        $('#quick_text_proceed').bind 'click', () =>
            @proceedQuickText()
        $('#text_search').bind 'mousedown', () =>
            log 'mousedown', window.getSelection()
            @selection = window.getSelection().toString()
        $('#text_search').bind 'click', () =>
            @searchSelection()
        $('#add_word_save').bind 'click', () =>
            @doAddWord()
        $('#dict_add').bind 'click', () =>
            @showAddWordDialog '', '', ''
        $('#word_panel_done').bind 'click', () =>
            @hideWordsPanel()
        $('#word_panel_ontop').bind 'click', () =>
            @wordsPanelOnTopToggle()
        $('#word_panel_font_up').bind 'click', () =>
            @wordsPanelFont 1
        $('#word_panel_font_down').bind 'click', () =>
            @wordsPanelFontDown -1
        $('#word_panel_timer_up').bind 'click', () =>
            @wordsPanelTimer 1
        $('#word_panel_timer_down').bind 'click', () =>
            @wordsPanelTimer -1
        $('#word_panel_line0').bind 'click', () =>
            @wordsPanelLine 0
        $('#word_panel_line1').bind 'click', () =>
            @wordsPanelLine 1
        $('#word_panel_line2').bind 'click', () =>
            @wordsPanelLine 2
        @db.open no, (err) =>
            if err 
                # Error opening DB - stop
                alert('DB error: '+err)
                return
            @loadDictionary()
        , yes

    reloadDictionaries: () ->
        @dictConfig = JSON.parse(@db.get 'dicts', '[]')
    
    saveDictionaries: ->
        @db.set 'dicts', JSON.stringify @dictConfig
        @loadDictionary()

    showDictionaries: () ->
        list = $('#dicts_list').empty()
        for i, item of @dictConfig
            # log 'item', item.name
            li = $(document.createElement('li')).appendTo(list)
            selectBtn = $(document.createElement('a')).appendTo(li).attr('href', '#')
            $(document.createElement('h3')).appendTo(selectBtn).text(item.name)
            $(document.createElement('p')).appendTo(selectBtn).text(item.file)
            $(document.createElement('p')).appendTo(selectBtn).text(item.rexp)
            removeBtn = $(document.createElement('a')).appendTo(li).attr('href', '#')
            removeBtn.bind 'click', {index: i}, (e) =>
                # log 'Remove', e.data.index
                @dictConfig.splice e.data.index, 1
                @saveDictionaries()
                @showDictionaries()
                no
        list.listview('refresh')

    showAddDictionary: () ->
        $('#dict_name').val('')
        $('#dict_rexp').val('')
        $('#dict_file').val('')
        $.mobile.changePage $('#add_dict'), {
            
        }

    showOpenFileDialog: ->
        file = new air.File()
        file.addEventListener 'select', (e) =>
            # log 'File selected', e.target.nativePath
            $('#dict_file').val e.target.nativePath
        file.browseForOpen 'Select file with dictionary'

    doAddDictionary: ->
        # ^(.*)\t+(.*)\t+(.*)$
        obj = {
            name: $('#dict_name').val()
            rexp: $('#dict_rexp').val()
            file: $('#dict_file').val()
        }
        if not obj.name 
            # Error
            alert 'Name is empty'
            return
        if not obj.file
            # Error
            alert 'File not selected'
            return
        @dictConfig.push obj
        @saveDictionaries()
        $.mobile.changePage $('#dicts'), {
            reverse: yes
        }
        @showDictionaries()

    proceedQuickText: (reverse = no) ->
        text = _.trim($('#quick_text').val())
        if not text
            alert 'Text is empty'
            return
        $.mobile.changePage $('#text'), {
            reverse: reverse
        }
        place = $('#text_here')
        @translateText text, place

    translateText: (text, element) -> 
        # Translates known words with dictionary
        element.empty()
        transDiv = $(document.createElement('div')).appendTo(element).addClass('trans')
        index = 0
        while index<text.length
            # check one by one
            wordFound = null
            for word in @dict
                # Check every word from @dict
                str = text.substr index, word.word.length
                if str is word.word and (not wordFound or str.length>wordFound?.word.length)
                    # Word found and found word longer than found befor or it's first word
                    # log 'Word found', str, word.word, index
                    wordFound = word
            if wordFound # Word found - use ruby
                # log 'Word', index, wordFound.word, wordFound.kana, wordFound.word.length, wordFound.trans
                ruby = $(document.createElement('div')).addClass('word word_found').appendTo(element)
                if word.kana # Have kana
                    rt = $(document.createElement('div')).appendTo(ruby).addClass('word_kana')
                    rt.text(wordFound.kana)
                    # rp = $(document.createElement('rp')).appendTo(ruby).addClass('word_kana')
                    # rp.text(wordFound.kana)
                textDiv = $(document.createElement('div')).addClass('word_kanji').appendTo(ruby)
                textDiv.text(wordFound.word)
                ruby.bind 'click', {div: ruby, word: wordFound}, (e) =>
                    transDiv.text e.data.word.trans
                    transDiv.detach().insertBefore(e.data.div.nextAll('.clear').first())
                    return false
                # $(document.createElement('wbr')).appendTo(element)
                index += wordFound.word.length
            else # not found - use span
                # log 'Not word', index
                if text.charAt(index) is '\n'
                    $(document.createElement('div')).appendTo(element).addClass('clear')
                else
                    span = $(document.createElement('div')).addClass('word word_not_found').appendTo(element)
                    span.text(text.charAt(index))
                    # $(document.createElement('wbr')).appendTo(element)
                index++
        $(document.createElement('div')).appendTo(element).addClass('clear')

    loadDictionary: (handler) ->
        @dict = []
        loadFromFile = (fileName, rexp, handler) =>
            file = new air.File fileName
            if not file.exists then return handler 'File is not exist'
            file.addEventListener 'complete', (e) =>
                data = file.data
                str = data.readUTFBytes data.length
                reg = new RegExp '^(.*?)\t+(.*?)\t+(.*?)$'
                lines = str.split '\n'
                words = 0
                for index, line of lines # Process lines
                    if not line then continue
                    m = _.trim(line).match reg
                    if not m then continue
                    word = {
                        word: m[1]
                        kana: m[2]
                        trans: m[3]
                    }
                    # log 'Word', word.word?.length, word.kana?.length, word.trans?.length
                    @dict.push word
                    words++
                log 'Words loaded', words, fileName, rexp, lines.length
                handler null, words
            file.load()
        for obj in @dictConfig
            loadFromFile obj.file, obj.rexp, (err, words) =>
                if err # Error
                    alert err
                    return
                if handler then handler null, words

    searchSelection: ->
        $.mobile.changePage $('#dict')
        log 'searchSelection', @selection
        $('#search').val(@selection ? '')
        $('#search').unbind('keydown').bind 'keydown', (e) =>
            if e.which is 13
                @doSearch()
                return false
        @doSearch()

    getSearchResults: (word, handler) ->
        if not word # No data
            return handler null, []
        @db.query 'select * from dict where kana=? or kanji like ? order by kanji desc, kana', [word, word+'%'], (err, data) =>
            if err then return handler err
            handler null, data

    doSearch: ->
        _extractDefinition = (entry) ->
            start = 0
            reg = /\S(;|$)/
            subreg = /^\s*(\d+.)?\s*(.*)$/
            idx = entry.search(reg)
            if  idx is -1
                return null
            m = entry.substr(0, idx+1).match(subreg)
            return m[2]
        _entryToEntry = (entry, parent) ->
            prefix = ''
            text = entry.entry
            reg = /\S(;|$)/
            subreg = /^\s*(\d+.)?\s*(.*)$/
            title = $(document.createElement('h4')).addClass('entry_title').appendTo(parent)
            title.text(entry.kanji+' 「'+entry.kana+'」 '+_extractDefinition(entry.entry))
            group = $(document.createElement('div')).addClass('entry_group').appendTo(parent)
            entryCount = 0;
            groupCount = 0;
            while text
                idx = text.search(reg)
                e = null
                if idx is -1
                    e = text
                    text = null
                else
                    e = ''
                    m = text.substr(0, idx+1).match(subreg)
                    if m[1]
                        if groupCount>0
                            group = $('<p/>').addClass('entry_group').appendTo(parent)
                        groupCount++
                        e += _.trim(m[1])+' '
                        entryCount = 0
                    e += _.trim(m[2])
                    text = text.substr(idx+2)
                if e
                    if prefix
                        e = prefix + e
                        prefix = null
                    div = $('<p/>').addClass('entry_line').appendTo(group)
                    if entryCount is 0
                        div.addClass('entry_line_first')
                    entryCount++
                    div.text(e)
        text = _.trim($('#search').val())
        list = $('#dict_results').empty()
        @getSearchResults text, (err, data) =>
            if err # Show error
                alert err
                return
            # log 'Search', data.length
            for entry in data # Create items
                li = $(document.createElement('li')).appendTo list
                selectBtn = $(document.createElement('a')).appendTo(li).attr('href', '#')
                _entryToEntry entry, selectBtn
                selectBtn.bind 'click', {entry: entry}, (e) =>
                    word = {
                        word: e.data.entry.kanji
                        kana: e.data.entry.kana
                        trans: _extractDefinition(e.data.entry.entry)
                    }
                    @dict.push word
                    @proceedQuickText yes
                    no
                addBtn = $(document.createElement('a')).appendTo(li).attr('href', '#')
                addBtn.bind 'click', {entry: entry}, (e) =>
                    # log 'Add here'
                    @showAddWordDialog e.data.entry.kanji, e.data.entry.kana, _extractDefinition(e.data.entry.entry), () =>
                    no
            list.listview('refresh')
    
    showAddWordDialog: (word, kana, trans) ->
        $.mobile.changePage $('#add_word')
        $('#word_word').val(word ? '')
        $('#word_kana').val(kana ? '')
        $('#word_trans').val(trans ? '')
        select = $('#word_dict').empty()
        for index, item of @dictConfig # Add entries
            # log 'Render', index, item, item.name
            option = $(document.createElement('option')).attr('value', index)
            option.text(item.name)
            select.append option
        select.selectmenu 'refresh'
    
    doAddWord: ->
        word = _.trim($('#word_word').val())
        if not word
            alert 'Word is empty'
            return
        kana = _.trim($('#word_kana').val())
        trans = _.trim($('#word_trans').val())
        if not trans
            alert 'Translation is empty'
            return
        index = $('#word_dict').val()
        fileConf = @dictConfig[index]
        if not fileConf
            alert 'File not selected'
            return
        try
            file = new air.File fileConf.file
            stream = new air.FileStream()
            stream.open file, 'append'
            data = '{1}\t\t{2}\t\t\t{3}\n'
            stream.writeUTFBytes data.replace('{1}', word).replace('{2}', kana).replace('{3}', trans)
            stream.close()
        catch error
          alert 'Error: '+error
          return
        word = {
            word: word
            kana: kana
            trans: trans
        }
        @dict.push word
        @proceedQuickText yes

    showWordsPanel: ->
        $.mobile.changePage $('#word_panel')
        @showWordInPanel()
        @wordsPanelTimer 0

    hideWordsPanel: ->
        if @wordsTimeoutID
            clearInterval @wordsTimeoutID
        $.mobile.changePage $('#main'), {
            reverse: yes
        }

    showWordInPanel: ->
        if @wordsCurrent>=@dict.length # No such word
            return
        $('#word_lines').css('font-size', "#{@wordsFont}em")
        $('#word_line0').text @dict[@wordsCurrent].word
        $('#word_line1').text @dict[@wordsCurrent].kana
        $('#word_line2').text @dict[@wordsCurrent].trans

    wordsPanelFont: (dir) ->
        if (dir<0 and @wordsFont>0.5) or dir>0
            @wordsFont += dir*0.1
        @showWordInPanel()

    wordsPanelLine: (index) ->
        @wordsLinesVisible[index] = not @wordsLinesVisible[index]
        # $('#word_panel_line'+index).attr('data-theme', if @wordsLinesVisible[index] then 'a' else 'e').button('refresh')
        $('#word_line'+index).css('visibility', if @wordsLinesVisible[index] then 'visible' else 'hidden')

    wordsPanelTimer: (dir) ->
        if (dir<0 and @wordsTimeout>1) or dir>0
            @wordsTimeout += dir
        $('#word_panel_h1').text "Word panel (#{@wordsTimeout})"
        if @wordsTimeoutID
            clearInterval @wordsTimeoutID
        @wordsTimeoutID = setInterval () =>
            @wordsCurrent = Math.floor(Math.random()*@dict.length)
            @showWordInPanel()
        , 1000*@wordsTimeout
    
    wordsPanelOnTopToggle: ->
        @wordsOnTop = not @wordsOnTop
        window.nativeWindow.alwaysInFront = @wordsOnTop
