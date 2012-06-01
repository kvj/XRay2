(function() {
  var AirDBProvider, Application, DBProvider,
    __hasProp = Object.prototype.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

  DBProvider = (function() {

    function DBProvider(name, version) {
      this.name = name;
      this.version = version != null ? version : '1';
    }

    DBProvider.prototype.open = function(clean, handler) {
      if (clean == null) clean = true;
      return handler('open: Not implemented');
    };

    DBProvider.prototype.verify = function(schema, handler) {
      return handler('Not implemented');
    };

    DBProvider.prototype.query = function(line, params, handler) {
      return handler('Not implemented');
    };

    DBProvider.prototype.get = function(name, def) {
      return null;
    };

    DBProvider.prototype.is = function(name, def) {
      return def != null ? def : false;
    };

    DBProvider.prototype.set = function(name, value) {
      return null;
    };

    return DBProvider;

  })();

  AirDBProvider = (function(_super) {

    __extends(AirDBProvider, _super);

    function AirDBProvider() {
      AirDBProvider.__super__.constructor.apply(this, arguments);
    }

    AirDBProvider.prototype.open = function(clean, handler, absolute) {
      var err, folder,
        _this = this;
      if (clean == null) clean = true;
      this.db = new air.SQLConnection();
      err = function(event) {
        log('open error', event);
        return handler(event.error.message);
      };
      this.db.addEventListener(air.SQLEvent.OPEN, function(event) {
        _this.db.removeEventListener(air.SQLErrorEvent.ERROR, err);
        return handler(null);
      });
      this.db.addEventListener(air.SQLErrorEvent.ERROR, err);
      if (absolute) {
        folder = air.File.applicationDirectory;
      } else {
        folder = air.File.applicationStorageDirectory;
      }
      this.dbFile = folder.resolvePath(this.name);
      return this.db.openAsync(this.dbFile, 'create', null, false, 1024);
    };

    AirDBProvider.prototype.verify = function(schema, handler) {
      var do_reset_schema, err,
        _this = this;
      err = function() {
        log('verify error', event);
        return do_reset_schema();
      };
      do_reset_schema = function() {
        var afterClose;
        _this.db.removeEventListener(air.SQLErrorEvent.ERROR, err);
        afterClose = function() {
          if (_this.dbFile.exists) _this.dbFile.deleteFile();
          return _this.open(false, function(err) {
            var createStmt, sql, sqlsDone, _i, _len, _results;
            if (err) return handler(err);
            sqlsDone = 0;
            _results = [];
            for (_i = 0, _len = schema.length; _i < _len; _i++) {
              sql = schema[_i];
              createStmt = new air.SQLStatement();
              createStmt.sqlConnection = _this.db;
              createStmt.addEventListener(air.SQLEvent.RESULT, function() {
                if (++sqlsDone >= schema.length) return handler(null);
              });
              createStmt.addEventListener(air.SQLErrorEvent.ERROR, function(event) {
                return handler(event.error.message);
              });
              createStmt.text = sql;
              _results.push(createStmt.execute());
            }
            return _results;
          });
        };
        _this.db.addEventListener('close', function(event) {
          return setTimeout(function() {
            return afterClose();
          }, 1000);
        });
        return _this.db.close();
      };
      this.db.addEventListener(air.SQLEvent.SCHEMA, function(event) {
        var table, tables, _i, _len, _ref, _ref2;
        tables = (_ref = (_ref2 = _this.db.getSchemaResult()) != null ? _ref2.tables : void 0) != null ? _ref : [];
        _this.tables = [];
        for (_i = 0, _len = tables.length; _i < _len; _i++) {
          table = tables[_i];
          _this.tables.push(table.name);
        }
        if (_this.clean) {
          return do_reset_schema();
        } else {
          return handler(null);
        }
      });
      this.db.addEventListener(air.SQLErrorEvent.ERROR, err);
      return this.db.loadSchema(air.SQLTableSchema);
    };

    AirDBProvider.prototype.query = function(line, params, handler) {
      var i, stmt, _ref,
        _this = this;
      stmt = new air.SQLStatement();
      stmt.sqlConnection = this.db;
      stmt.addEventListener(air.SQLEvent.RESULT, function(event) {
        var data, i, numResults, result, row;
        result = stmt.getResult();
        data = [];
        if (!result || !result.data) return handler(null, data);
        numResults = result.data.length;
        for (i = 0; 0 <= numResults ? i < numResults : i > numResults; 0 <= numResults ? i++ : i--) {
          row = result.data[i];
          data.push(row);
        }
        return handler(null, data);
      });
      stmt.addEventListener(air.SQLErrorEvent.ERROR, function(event) {
        return handler(event.error.message);
      });
      stmt.text = line;
      for (i = 0, _ref = params.length; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
        stmt.parameters[i] = params[i];
      }
      return stmt.execute();
    };

    AirDBProvider.prototype.get = function(name, def) {
      var arr;
      arr = air.EncryptedLocalStore.getItem(name);
      if (!name) return def;
      try {
        return arr.readUTF();
      } catch (error) {

      }
      return def;
    };

    AirDBProvider.prototype.is = function(name, def) {
      var arr;
      arr = air.EncryptedLocalStore.getItem(name);
      if (!name) return def != null ? def : false;
      try {
        return arr.readUTF();
      } catch (error) {

      }
      return def === true || def === 'true' || def === 'yes';
    };

    AirDBProvider.prototype.set = function(name, value) {
      var arr;
      if (!name) return false;
      if (!value) air.EncryptedLocalStore.removeItem(name);
      arr = new air.ByteArray();
      arr.writeUTF('' + value);
      return air.EncryptedLocalStore.setItem(name, arr);
    };

    return AirDBProvider;

  })(DBProvider);

  yepnope({
    load: ['lib/custom-web/cross-utils.js', 'lib/common-web/jquery-1.7.1.min.js', 'lib/common-web/underscore-min.js', 'lib/common-web/underscore.strings.js', 'lib/custom-web/date.js', 'lib/common-web/json2.js', 'lib/custom-web/layout.js'],
    complete: function() {
      return yepnope([
        {
          test: CURRENT_PLATFORM === PLATFORM_AIR,
          yep: ['lib/air/AIRAliases.js', 'lib/air/AIRIntrospector.js']
        }, {
          load: ['app/xray2.css'],
          complete: function() {
            return $(document).bind('mobileinit', function() {
              log('Init done');
              return new Application();
            });
          }
        }, {
          load: ['lib/jqm/jquery.mobile-1.1.0.min.js', 'lib/jqm/jquery.mobile-1.1.0.min.css']
        }
      ]);
    }
  });

  Application = (function() {

    function Application() {
      var _this = this;
      this.db = new AirDBProvider('app/dict.sqlite');
      $('#main_settings').bind('click', function() {
        $.mobile.changePage($('#dicts'));
        _this.showDictionaries();
        return false;
      });
      $('#dicts_done').bind('click', function() {
        return $.mobile.changePage($('#main'), {
          reverse: true
        });
      });
      $('#text_done').bind('click', function() {
        return $.mobile.changePage($('#main'), {
          reverse: true
        });
      });
      $('#dict_done').bind('click', function() {
        return $.mobile.changePage($('#text'), {
          reverse: true
        });
      });
      $('#add_word_cancel').bind('click', function() {
        return $.mobile.changePage($('#dict'), {
          reverse: true
        });
      });
      $('#dicts_add').bind('click', function() {
        return _this.showAddDictionary();
      });
      $('#add_dict_file').bind('click', function() {
        return _this.showOpenFileDialog();
      });
      this.reloadDictionaries();
      $('#add_dict_save').bind('click', function() {
        return _this.doAddDictionary();
      });
      $('#quick_text_proceed').bind('click', function() {
        return _this.proceedQuickText();
      });
      $('#text_search').bind('mousedown', function() {
        log('mousedown', window.getSelection());
        return _this.selection = window.getSelection().toString();
      });
      $('#text_search').bind('click', function() {
        return _this.searchSelection();
      });
      $('#add_word_save').bind('click', function() {
        return _this.doAddWord();
      });
      $('#dict_add').bind('click', function() {
        return _this.showAddWordDialog('', '', '');
      });
      this.db.open(false, function(err) {
        if (err) {
          alert('DB error: ' + err);
          return;
        }
        return _this.loadDictionary();
      }, true);
    }

    Application.prototype.reloadDictionaries = function() {
      return this.dictConfig = JSON.parse(this.db.get('dicts', '[]'));
    };

    Application.prototype.saveDictionaries = function() {
      this.db.set('dicts', JSON.stringify(this.dictConfig));
      return this.loadDictionary();
    };

    Application.prototype.showDictionaries = function() {
      var i, item, li, list, removeBtn, _ref,
        _this = this;
      list = $('#dicts_list').empty();
      _ref = this.dictConfig;
      for (i in _ref) {
        item = _ref[i];
        log('item', item.name);
        li = $(document.createElement('li')).appendTo(list);
        $(document.createElement('h3')).appendTo(li).text(item.name);
        $(document.createElement('p')).appendTo(li).text(item.file);
        $(document.createElement('p')).appendTo(li).text(item.rexp);
        $(document.createElement('a')).appendTo(li).attr('href', '#');
        removeBtn = $(document.createElement('a')).appendTo(li).attr('href', '#');
        removeBtn.bind('click', {
          index: i
        }, function(e) {
          log('Remove', e.data.index);
          _this.dictConfig.splice(e.data.index, 1);
          _this.saveDictionaries();
          _this.showDictionaries();
          return false;
        });
      }
      return list.listview('refresh');
    };

    Application.prototype.showAddDictionary = function() {
      $('#dict_name').val('');
      $('#dict_rexp').val('');
      $('#dict_file').val('');
      return $.mobile.changePage($('#add_dict'), {});
    };

    Application.prototype.showOpenFileDialog = function() {
      var file,
        _this = this;
      file = new air.File();
      file.addEventListener('select', function(e) {
        log('File selected', e.target.nativePath);
        return $('#dict_file').val(e.target.nativePath);
      });
      return file.browseForOpen('Select file with dictionary');
    };

    Application.prototype.doAddDictionary = function() {
      var obj;
      obj = {
        name: $('#dict_name').val(),
        rexp: $('#dict_rexp').val(),
        file: $('#dict_file').val()
      };
      if (!obj.name) {
        alert('Name is empty');
        return;
      }
      if (!obj.file) {
        alert('File not selected');
        return;
      }
      this.dictConfig.push(obj);
      this.saveDictionaries();
      $.mobile.changePage($('#dicts'), {
        reverse: true
      });
      return this.showDictionaries();
    };

    Application.prototype.proceedQuickText = function(reverse) {
      var place, text;
      if (reverse == null) reverse = false;
      text = _.trim($('#quick_text').val());
      if (!text) {
        alert('Text is empty');
        return;
      }
      $.mobile.changePage($('#text'), {
        reverse: reverse
      });
      place = $('#text_here');
      return this.translateText(text, place);
    };

    Application.prototype.translateText = function(text, element) {
      var index, rt, ruby, span, str, textDiv, transDiv, word, wordFound, _i, _len, _ref,
        _this = this;
      element.empty();
      transDiv = $(document.createElement('div')).appendTo(element).addClass('trans');
      index = 0;
      while (index < text.length) {
        wordFound = null;
        _ref = this.dict;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          word = _ref[_i];
          str = text.substr(index, word.word.length);
          if (str === word.word && (!wordFound || str.length > (wordFound != null ? wordFound.word.length : void 0))) {
            wordFound = word;
          }
        }
        if (wordFound) {
          ruby = $(document.createElement('div')).addClass('word word_found').appendTo(element);
          if (word.kana) {
            rt = $(document.createElement('div')).appendTo(ruby).addClass('word_kana');
            rt.text(wordFound.kana);
          }
          textDiv = $(document.createElement('div')).addClass('word_kanji').appendTo(ruby);
          textDiv.text(wordFound.word);
          ruby.bind('click', {
            div: ruby,
            word: wordFound
          }, function(e) {
            transDiv.text(e.data.word.trans);
            transDiv.detach().insertBefore(e.data.div.nextAll('.clear').first());
            return false;
          });
          index += wordFound.word.length;
        } else {
          if (text.charAt(index) === '\n') {
            $(document.createElement('div')).appendTo(element).addClass('clear');
          } else {
            span = $(document.createElement('div')).addClass('word word_not_found').appendTo(element);
            span.text(text.charAt(index));
          }
          index++;
        }
      }
      return $(document.createElement('div')).appendTo(element).addClass('clear');
    };

    Application.prototype.loadDictionary = function(handler) {
      var loadFromFile, obj, _i, _len, _ref, _results,
        _this = this;
      this.dict = [];
      loadFromFile = function(fileName, rexp, handler) {
        var file;
        file = new air.File(fileName);
        if (!file.exists) return handler('File is not exist');
        file.addEventListener('complete', function(e) {
          var data, index, line, lines, m, reg, str, word, words;
          data = file.data;
          str = data.readUTFBytes(data.length);
          reg = new RegExp('^(.*?)\t+(.*?)\t+(.*?)$');
          lines = str.split('\n');
          words = 0;
          for (index in lines) {
            line = lines[index];
            if (!line) continue;
            m = _.trim(line).match(reg);
            if (!m) continue;
            word = {
              word: m[1],
              kana: m[2],
              trans: m[3]
            };
            _this.dict.push(word);
            words++;
          }
          log('Words loaded', words, fileName, rexp, lines.length);
          return handler(null, words);
        });
        return file.load();
      };
      _ref = this.dictConfig;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        obj = _ref[_i];
        _results.push(loadFromFile(obj.file, obj.rexp, function(err, words) {
          if (err) {
            alert(err);
            return;
          }
          if (handler) return handler(null, words);
        }));
      }
      return _results;
    };

    Application.prototype.searchSelection = function() {
      var _ref,
        _this = this;
      $.mobile.changePage($('#dict'));
      log('searchSelection', this.selection);
      $('#search').val((_ref = this.selection) != null ? _ref : '');
      $('#search').unbind('keydown').bind('keydown', function(e) {
        if (e.which === 13) {
          _this.doSearch();
          return false;
        }
      });
      return this.doSearch();
    };

    Application.prototype.getSearchResults = function(word, handler) {
      var _this = this;
      if (!word) return handler(null, []);
      return this.db.query('select * from dict where kana=? or kanji=? order by kanji desc, kana', [word, word], function(err, data) {
        if (err) return handler(err);
        return handler(null, data);
      });
    };

    Application.prototype.doSearch = function() {
      var list, text, _entryToEntry, _extractDefinition,
        _this = this;
      _extractDefinition = function(entry) {
        var idx, m, reg, start, subreg;
        start = 0;
        reg = /\S(;|$)/;
        subreg = /^\s*(\d+.)?\s*(.*)$/;
        idx = entry.search(reg);
        if (idx === -1) return null;
        m = entry.substr(0, idx + 1).match(subreg);
        return m[2];
      };
      _entryToEntry = function(entry, parent) {
        var div, e, entryCount, group, groupCount, idx, m, prefix, reg, subreg, text, title, _results;
        prefix = '';
        text = entry.entry;
        reg = /\S(;|$)/;
        subreg = /^\s*(\d+.)?\s*(.*)$/;
        title = $(document.createElement('h4')).addClass('entry_title').appendTo(parent);
        title.text(entry.kanji + ' 「' + entry.kana + '」 ' + _extractDefinition(entry.entry));
        group = $(document.createElement('div')).addClass('entry_group').appendTo(parent);
        entryCount = 0;
        groupCount = 0;
        _results = [];
        while (text) {
          idx = text.search(reg);
          e = null;
          if (idx === -1) {
            e = text;
            text = null;
          } else {
            e = '';
            m = text.substr(0, idx + 1).match(subreg);
            if (m[1]) {
              if (groupCount > 0) {
                group = $('<p/>').addClass('entry_group').appendTo(parent);
              }
              groupCount++;
              e += _.trim(m[1]) + ' ';
              entryCount = 0;
            }
            e += _.trim(m[2]);
            text = text.substr(idx + 2);
          }
          if (e) {
            if (prefix) {
              e = prefix + e;
              prefix = null;
            }
            div = $('<p/>').addClass('entry_line').appendTo(group);
            if (entryCount === 0) div.addClass('entry_line_first');
            entryCount++;
            _results.push(div.text(e));
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      };
      text = _.trim($('#search').val());
      list = $('#dict_results').empty();
      return this.getSearchResults(text, function(err, data) {
        var addBtn, entry, li, selectBtn, _i, _len;
        if (err) {
          alert(err);
          return;
        }
        for (_i = 0, _len = data.length; _i < _len; _i++) {
          entry = data[_i];
          li = $(document.createElement('li')).appendTo(list);
          selectBtn = $(document.createElement('a')).appendTo(li).attr('href', '#');
          _entryToEntry(entry, selectBtn);
          selectBtn.bind('click', {
            entry: entry
          }, function(e) {
            var word;
            word = {
              word: e.data.entry.kanji,
              kana: e.data.entry.kana,
              trans: _extractDefinition(e.data.entry.entry)
            };
            _this.dict.push(word);
            _this.proceedQuickText(true);
            return false;
          });
          addBtn = $(document.createElement('a')).appendTo(li).attr('href', '#');
          addBtn.bind('click', {
            entry: entry
          }, function(e) {
            _this.showAddWordDialog(e.data.entry.kanji, e.data.entry.kana, _extractDefinition(e.data.entry.entry), function() {});
            return false;
          });
        }
        return list.listview('refresh');
      });
    };

    Application.prototype.showAddWordDialog = function(word, kana, trans) {
      var index, item, option, select, _ref;
      $.mobile.changePage($('#add_word'));
      $('#word_word').val(word != null ? word : '');
      $('#word_kana').val(kana != null ? kana : '');
      $('#word_trans').val(trans != null ? trans : '');
      select = $('#word_dict').empty();
      _ref = this.dictConfig;
      for (index in _ref) {
        item = _ref[index];
        option = $(document.createElement('option')).attr('value', index);
        option.text(item.name);
        select.append(option);
      }
      return select.selectmenu('refresh');
    };

    Application.prototype.doAddWord = function() {
      var data, file, fileConf, index, kana, stream, trans, word;
      word = _.trim($('#word_word').val());
      if (!word) {
        alert('Word is empty');
        return;
      }
      kana = _.trim($('#word_kana').val());
      trans = _.trim($('#word_trans').val());
      if (!trans) {
        alert('Translation is empty');
        return;
      }
      index = $('#word_dict').val();
      fileConf = this.dictConfig[index];
      if (!fileConf) {
        alert('File not selected');
        return;
      }
      try {
        file = new air.File(fileConf.file);
        stream = new air.FileStream();
        stream.open(file, 'append');
        data = '{1}\t\t{2}\t\t\t{3}\n';
        stream.writeUTFBytes(data.replace('{1}', word).replace('{2}', kana).replace('{3}', trans));
        stream.close();
      } catch (error) {
        alert('Error: ' + error);
        return;
      }
      word = {
        word: word,
        kana: kana,
        trans: trans
      };
      this.dict.push(word);
      return this.proceedQuickText(true);
    };

    return Application;

  })();

}).call(this);
