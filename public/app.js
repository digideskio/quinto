// Generated by CoffeeScript 1.7.1
(function() {
  var Game, GameState, Player, checkMove, droppedTile, escape, gameState, getMove, handleAction, handleActions, myTurn, post, processTiles, request, selectTile, sendMove, sendPass, currentMoveCount, loadPreviousState, allowMoves,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty;

  var actionHandler = {};
  var game_info = document.getElementById("game-info");
  var gameId = parseInt(game_info.getAttribute('data-gameId'));
  var playerPosition = parseInt(game_info.getAttribute('data-playerPosition'));
  var players = JSON.parse(game_info.getAttribute('data-players'));
  var token = game_info.getAttribute('data-token');
  var channel = game_info.getAttribute('data-channel');
  var baseUrl = channel + '/';

  $.ajaxSetup({headers: {'X-CSRF-TOKEN': token}});

  MessageBus.baseUrl = baseUrl;
  MessageBus.start();

  $.fn.serializeObject = function() {
    var arrayData, objectData;
    arrayData = this.serializeArray();
    objectData = {};
    $.each(arrayData, function() {
      var value;
      if (this.value != null) {
        value = this.value;
      } else {
        value = '';
      }
      if (objectData[this.name] != null) {
        if (!objectData[this.name].push) {
          objectData[this.name] = [objectData[this.name]];
        }
        return objectData[this.name].push(value);
      } else {
        return objectData[this.name] = value;
      }
    });
    return objectData;
  };

  escape = function(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  };

  request = function(path, f, opts) {
    if (f == null) {
      f = null;
    }
    if (opts == null) {
      opts = {};
    }
    opts.url = window.location.pathname + path;
    opts.dataType = 'json';
    opts.cache = false;
    opts.success = handleActions;
    opts.data = f ? f() : {};
    opts.timeout = 600000;
    if (!opts.error) {
      opts.error = function(data) {
        return document.getElementById('current_move').innerHTML = "<h2>Server Error: " + data.responseText + "</h2>";
      };
    }
    $.ajax(opts);
    return false;
  };

  post = function(path, f, opts) {
    if (f == null) {
      f = null;
    }
    if (opts == null) {
      opts = {};
    }
    return function(e) {
      if (e) {
        e.preventDefault();
      }
      request(path, f, {
        type: 'POST'
      });
    };
  };

  gameState = function() {
    return game.state();
  };

  handleActions = function(actions) {
    var i, _len;
    for (i = 0, _len = actions.length; i < _len; i++) {
      handleAction(actions[i]);
    }
  };

  handleAction = function(a) {
    var f;
    f = actionHandler[a.action];
    if (f) {
      f(a);
    } else {
      alert("Unhandled action: " + a.action);
    }
  };

  actionHandler.poll = function(a) {
    MessageBus.subscribe(channel, actionHandler.check);
  }

  actionHandler.check = function() {
    MessageBus.unsubscribe(channel, actionHandler.check);
    request("/check", null, {
      "error": (function() {
        setTimeout(actionHandler.check, 60000);
      }),
    });
  };

  myTurn = function() {
    return playerPosition === gameState().toMove;
  };

  actionHandler.updateInfo = function(a) {
    var board, board_html, gs, i, k, oldBoard, p, pos, tp, v, value, x, y, _i, _j, _ref, _ref1, _ref2;
    gs = gameState();
    oldBoard = gs.board;
    _ref = a.state;
    for (k in _ref) {
      v = _ref[k];
      gs[k] = v;
    }
    board = gs.board;
    tp = gs.translatePos;
    board_html = "<table>";
    var to_move = game.players[gs.toMove].email;
    for (y = _i = 0, _ref1 = Game.boardY; 0 <= _ref1 ? _i < _ref1 : _i > _ref1; y = 0 <= _ref1 ? ++_i : --_i) {
      board_html += "<tr>";
      for (x = _j = 0, _ref2 = Game.boardX; 0 <= _ref2 ? _j < _ref2 : _j > _ref2; x = 0 <= _ref2 ? ++_j : --_j) {
        pos = tp(x, y);
        value = board[pos];
        board_html += "<td class='board_tile";
        if (value) {
          board_html += ' fixed';
          if (!oldBoard[pos]) {
            board_html += ' last';
          }
        }
        board_html += "' id='" + pos + "'>";
        if (value) {
          board_html += value;
        }
        board_html += "</td>";
      }
      board_html += "</tr>";
    }
    board_html += "</table>";
    document.getElementById('board').innerHTML = board_html;
    document.getElementById('scores').innerHTML = ("<table class='table'><caption>Scores</caption><tbody>" + (((function() {
      var _k, _len, _ref3, _results;
      _ref3 = game.players;
      _results = [];
      for (i = _k = 0, _len = _ref3.length; _k < _len; i = ++_k) {
        p = _ref3[i];
        _results.push("<tr><td" + (to_move == p.email ? ' class="to_move"' : '') + ">" + (i === playerPosition ? 'You' : escape(p.email)) + "</td><td>" + gs.scores[i] + "</td></tr>");
      }
      return _results;
    })()).join('')) + "</tbody></table>");
    if (!_ref.gameOver) {
      document.getElementById('rack').innerHTML = ("<div id='tile_holder'>" + (((function() {
        var _k, _len, _ref3, _results;
        _ref3 = gs.rack;
        _results = [];
        for (i = _k = 0, _len = _ref3.length; _k < _len; i = ++_k) {
          x = _ref3[i];
          _results.push("<div class='rack_tile' draggable='true' id='rack" + i + "'>" + x + "</div>");
        }
        return _results;
      })()).join('')) + "</div><h2>Your Tile Rack</h2>");
      document.getElementById('current_move').innerHTML = '';
    }
  };

  actionHandler.activeState = function(a) {
    var i, gs, el, option;
    gs = gameState();
    currentMoveCount = gs.moveCount;
    allowMoves = false;

    if (currentMoveCount >= 0) {
      document.getElementById('move_num').textContent = currentMoveCount;
      document.getElementById('move_count').style.display = 'block';
      el = document.getElementById('previous_state');
      el.innerHTML = '';
      el.appendChild(document.createElement('option'));
      for (i = currentMoveCount - 1; i >= 0; i--) {
        option = document.createElement('option');
        option.text = i;
        el.appendChild(option);
      }
      document.getElementById('previous_states').style.display = 'block';
    }

    if (!gs.gameOver && myTurn()) {
      allowMoves = true;
      var tiles = document.getElementsByClassName('board_tile');
      for (i = 0; i < tiles.length; i++) {
        tiles[i].ondragover = function(ev){ ev.preventDefault();};
        tiles[i].ondrop = droppedTile;
      }
      tiles = document.getElementsByClassName('rack_tile');
      for (i = 0; i < tiles.length; i++) {
        tiles[i].ondragstart = function(ev) {
          ev.dataTransfer.setData("text", ev.target.id);
        };
      }
      checkMove();
    }
  }

  actionHandler.previousState = function(a) {
    allowMoves = false;
    document.getElementById('resume_play').style.display = 'block';
  }

  droppedTile = function(ev) {
    var b, b2, r, r2;
    ev.preventDefault();
    b = $(ev.target);
    if (!b.hasClass('fixed')) {
      r = $(document.getElementById(ev.dataTransfer.getData("text")));
      $('.current').removeClass('current');
      b.addClass('current');
      r.addClass('current');
      if (r2 = b.data('assoc')) {
        r2.data('assoc', null);
        r2.removeClass('move');
      }
      if (b2 = r.data('assoc')) {
        b2.html('');
        b2.data('assoc', null);
        b2.removeClass('move');
      }
      return processTiles();
    }
  };

  actionHandler.gameOver = function(a) {
    document.getElementById('rack').innerHTML = '';
    return document.getElementById('current_move').innerHTML = "<h2>Game Over!</h2><h2>Winners: " + (a.winners.join(', ')) + "</h2>";
  };

  selectTile = function(e) {
    var d, exist, t;
    if (!allowMoves || !myTurn()) {
      return;
    }
    exist = $(e.data);
    t = $(e.target);
    if (t.hasClass('current')) {
      return t.removeClass('current');
    } else if (t.hasClass('fixed')) {
      return null;
    } else {
      exist.filter('.current').removeClass('current');
      d = t.data('assoc');
      if (t.hasClass('move')) {
        if (e.data === '.board_tile') {
          t.html('');
        } else if (d != null) {
          d.html('');
        }
        if (d != null) {
          d.removeClass('move');
        }
        t.removeClass('move');
      }
      t.addClass('current');
      document.getElementById("current_move").innerHTML = '';
      return processTiles();
    }
  };

  getMove = function() {
    return $('.rack_tile.move').filter(function() {
      return $(this).data('assoc') != null;
    }).map(function() {
      var t;
      t = $(this);
      return "" + (t.html()) + (t.data('assoc').attr('id'));
    }).get().join(' ');
  };

  sendMove = post("/move", function() {
    return {
      move: getMove()
    };
  });

  sendPass = post("/pass");

  processTiles = function() {
    var b, r;
    b = $('.board_tile.current');
    r = $('.rack_tile.current');
    if (b.length > 0 && r.length > 0) {
      b.html(r.html());
      b.data('assoc', r);
      r.data('assoc', b);
      b.add(r).addClass('move').removeClass('current');
    }
    return checkMove();
  };

  checkMove = function() {
    var changes, error, gs, k, move, v;
    move = getMove();
    gs = gameState();
    if (move) {
      try {
        changes = gs.checkMove(move, gs.board, gs.rack);
        document.getElementById('current_move').innerHTML = ("<table class='table'><caption>Move Score: " + changes.score + "</caption><tbody>" + (((function() {
          var _ref, _results;
          _ref = changes.lastRuns;
          _results = [];
          for (k in _ref) {
            v = _ref[k];
            _results.push("<tr><td>" + k + ":</td><td>" + v + "</td></tr>");
          }
          return _results;
        })()).join('')) + "</tbody></table><button type='button' class='btn btn-primary' id='commit_move'>Commit Move</button>");
        return $('#commit_move').click(sendMove);
      } catch (_error) {
        error = _error;
        return document.getElementById("current_move").innerHTML = "<h2>" + error + "</h2>";
      }
    } else {
      document.getElementById('current_move').innerHTML = "<button type='button' class='btn btn-primary' id='pass'>Pass" + (gs.passCount === game.players.length - 1 ? ' and End Game' : '') + "</button>";
      return $('#pass').click(sendPass);
    }
  };

  loadPreviousState = function(){
    var i = document.getElementById('previous_state').value;
    if (i !== '') {
      request("/state/" + i);
    }
  };

  resumePlay = function(ev){
    document.getElementById('resume_play').style.display = 'none';
    ev.preventDefault();
    request("/check");
  };

  $(function() {
    $('#board').on('click', '.board_tile', '.board_tile', selectTile);
    $('#rack').on('click', '.rack_tile', '.rack_tile', selectTile);
    $('#previous_state').on('change', loadPreviousState);
    $('#resume_play').on('click', resumePlay);

    var p;
    game = new Game((function() {
      var _i, _len, _ref, _results;
      _ref = players;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        p = _ref[_i];
        _results.push(new Player(p));
      }
      return _results;
    })());

    request('/check');
  });

  Player = Player;

  Game = Game;

  GameState = GameState;

  Player = (function() {
    function Player(email) {
      this.email = email;
      if (!this.email) {
        throw "player must have an email";
      }
    }

    return Player;

  })();

  GameState = (function() {
    function GameState(previous, changes) {
      this.useRackTile = __bind(this.useRackTile, this);
      this.checkValidMoves = __bind(this.checkValidMoves, this);
      this.translatePos = __bind(this.translatePos, this);
      this.winners = __bind(this.winners, this);
      this.empty = __bind(this.empty, this);
      this.pass = __bind(this.pass, this);
      this.checkMove = __bind(this.checkMove, this);
      this.move = __bind(this.move, this);
      this.takeTiles = __bind(this.takeTiles, this);
      this.fillRack = __bind(this.fillRack, this);
      var i, k, r, rack, v, x, _i, _j, _len, _len1, _ref, _ref1;
      for (k in previous) {
        if (!__hasProp.call(previous, k)) continue;
        v = previous[k];
        if (!(v instanceof Function)) {
          this[k] = v;
        }
      }
      for (k in changes) {
        if (!__hasProp.call(changes, k)) continue;
        v = changes[k];
        this[k] = v;
      }
      if (this.gameOver) {
        throw "Game already ended, can't make more moves";
      }
      this.moveCount = this.moveCount + 1;
      this.toMove = this.moveCount % this.racks.length;
      this.tiles = this.tiles.slice();
      this.racks = (function() {
        var _i, _len, _ref, _results;
        _ref = this.racks;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          rack = _ref[_i];
          _results.push(this.fillRack(rack).sort(this.rackSort));
        }
        return _results;
      }).call(this);
      if (this.passCount === this.racks.length) {
        this.gameOver = true;
      } else {
        _ref = this.racks;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          x = _ref[_i];
          if (x.length === 0) {
            this.gameOver = true;
          }
        }
      }
      if (this.gameOver) {
        _ref1 = this.racks;
        for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
          r = _ref1[i];
          this.scores[i] -= this.sum(r);
        }
      }
    }

    GameState.prototype.rackSort = function(a, b) {
      return parseInt(a, 10) - parseInt(b, 10);
    };

    GameState.prototype.fillRack = function(rack) {
      return rack.concat(this.takeTiles(this.game.rackSize - rack.length));
    };

    GameState.prototype.takeTiles = function(i) {
      return this.tiles.splice(0, i >= this.tiles.length ? this.tiles.length : i);
    };

    GameState.prototype.move = function(moves) {
      var changes, racks, scores;
      changes = this.checkMove(moves, this.board, this.racks[this.toMove]);
      scores = this.scores.slice();
      scores[this.toMove] += changes.score;
      changes.scores = scores;
      delete changes.score;
      racks = this.racks.slice();
      racks[this.toMove] = changes.rack;
      changes.racks = racks;
      delete changes.rack;
      return new GameState(this, changes);
    };

    GameState.prototype.checkMove = function(moves, b, rack) {
      var board, k, n, runs, score, ts, v, x, y, _i, _len, _ref;
      board = {};
      for (k in b) {
        if (!__hasProp.call(b, k)) continue;
        v = b[k];
        board[k] = v;
      }
      rack = rack.slice();
      ts = this.translateMoves(moves);
      for (_i = 0, _len = ts.length; _i < _len; _i++) {
        _ref = ts[_i], n = _ref[0], x = _ref[1], y = _ref[2];
        this.useRackTile(rack, n);
      }
      this.checkValidMoves(board, ts);
      this.checkBoard(board);
      runs = this.getRuns(board, ts);
      score = this.sum((function() {
        var _results;
        _results = [];
        for (k in runs) {
          v = runs[k];
          _results.push(v);
        }
        return _results;
      })());
      return {
        board: board,
        rack: rack,
        score: score,
        lastMove: moves,
        lastRuns: runs,
        passCount: 0
      };
    };

    GameState.prototype.pass = function() {
      return new GameState(this, {
        lastMove: null,
        lastRuns: null,
        passCount: this.passCount + 1
      });
    };

    GameState.prototype.empty = function() {
      return this.moveCount - this.passCount === 0;
    };

    GameState.prototype.winners = function() {
      var i, max, s, _i, _j, _len, _len1, _ref, _ref1, _results;
      max = this.scores[0];
      _ref = this.scores;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        s = _ref[_i];
        if (s > max) {
          max = s;
        }
      }
      _ref1 = this.scores;
      _results = [];
      for (i = _j = 0, _len1 = _ref1.length; _j < _len1; i = ++_j) {
        s = _ref1[i];
        if (s === max) {
          _results.push(this.game.players[i]);
        }
      }
      return _results;
    };

    GameState.prototype.getRuns = function(b, ts) {
      var n, scores, x, y, _i, _len, _ref;
      scores = {};
      if (this.empty() && ts.length === 1) {
        scores[this.translatePos(ts[0][1], ts[0][2])] = ts[0][0];
      } else {
        for (_i = 0, _len = ts.length; _i < _len; _i++) {
          _ref = ts[_i], n = _ref[0], x = _ref[1], y = _ref[2];
          if (b[this.translatePos(x + 1, y)] || b[this.translatePos(x - 1, y)]) {
            this.xRun(scores, b, y, x);
          }
          if (b[this.translatePos(x, y + 1)] || b[this.translatePos(x, y - 1)]) {
            this.yRun(scores, b, y, x);
          }
        }
      }
      return scores;
    };

    GameState.prototype.xRun = function(scores, b, y, x) {
      var i, xMax, xMin, _name;
      xMin = x;
      xMax = x;
      while (b[this.translatePos(xMin - 1, y)]) {
        xMin--;
      }
      while (b[this.translatePos(xMax + 1, y)]) {
        xMax++;
      }
      return scores[_name = "" + y + (this.translateCol(xMin)) + "-" + (this.translateCol(xMax))] != null ? scores[_name] : scores[_name] = this.sum((function() {
        var _i, _results;
        _results = [];
        for (i = _i = xMin; xMin <= xMax ? _i <= xMax : _i >= xMax; i = xMin <= xMax ? ++_i : --_i) {
          _results.push(b[this.translatePos(i, y)]);
        }
        return _results;
      }).call(this));
    };

    GameState.prototype.yRun = function(scores, b, y, x) {
      var i, yMax, yMin, _name;
      yMin = y;
      yMax = y;
      while (b[this.translatePos(x, yMin - 1)]) {
        yMin--;
      }
      while (b[this.translatePos(x, yMax + 1)]) {
        yMax++;
      }
      return scores[_name = "" + (this.translateCol(x)) + yMin + "-" + yMax] != null ? scores[_name] : scores[_name] = this.sum((function() {
        var _i, _results;
        _results = [];
        for (i = _i = yMin; yMin <= yMax ? _i <= yMax : _i >= yMax; i = yMin <= yMax ? ++_i : --_i) {
          _results.push(b[this.translatePos(x, i)]);
        }
        return _results;
      }).call(this));
    };

    GameState.prototype.sum = function(a) {
      var score, x, _i, _len;
      score = 0;
      for (_i = 0, _len = a.length; _i < _len; _i++) {
        x = a[_i];
        score += x;
      }
      return score;
    };

    GameState.prototype.translateMoves = function(moves) {
      var d, m, x, _i, _len, _ref, _results;
      d = /\d/;
      _ref = moves.split(' ');
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        m = _ref[_i];
        x = d.test(m[1]) ? 2 : 1;
        _results.push([parseInt(m.slice(0, x), 10), m.charCodeAt(x) - 97, parseInt(m.slice(x + 1, +m.length + 1 || 9e9), 10)]);
      }
      return _results;
    };

    GameState.prototype.translatePos = function(x, y) {
      return "" + (this.translateCol(x)) + y;
    };

    GameState.prototype.translateCol = function(x) {
      return String.fromCharCode(x + 97);
    };

    GameState.prototype.checkValidMoves = function(b, ts) {
      var centerX, centerY, col, i, mx, my, n, row, sm, x, y, _i, _j, _len, _len1, _ref, _ref1;
      mx = this.game.boardX;
      my = this.game.boardY;
      for (_i = 0, _len = ts.length; _i < _len; _i++) {
        _ref = ts[_i], n = _ref[0], x = _ref[1], y = _ref[2];
        if (x >= mx || y >= my || x < 0 || y < 0) {
          throw "attempt to place tile outside of board: pos: " + (this.translatePos(x, y));
        }
      }
      ts = this.empty() ? this.reorderTiles(b, [ts[0]], ts.slice(1, +(ts.length - 1) + 1 || 9e9)) : this.reorderTiles(b, [], ts.slice(0, +(ts.length - 1) + 1 || 9e9));
      row = null;
      col = null;
      i = 0;
      for (_j = 0, _len1 = ts.length; _j < _len1; _j++) {
        _ref1 = ts[_j], n = _ref1[0], x = _ref1[1], y = _ref1[2];
        switch (i) {
          case 0:
            row = x;
            col = y;
            break;
          case 1:
            if (row === x) {
              col = null;
            } else if (col === y) {
              row = null;
            } else {
              throw "attempt to place tile not in same row or column: row: " + row + ", col: " + (this.translateCol(col)) + ", pos: " + (this.translatePos(x, y));
            }
            break;
          default:
            if (row === null) {
              if (col !== y) {
                throw "attempt to place tile not in same column: col: " + (this.translateCol(col)) + ", pos: " + (this.translatePos(x, y));
              }
            } else if (row !== x) {
              throw "attempt to place tile not in same row: row: " + row + ", pos: " + (this.translatePos(x, y));
            }
        }
        if (!(this.empty() && i === 0)) {
          if (!(b[this.translatePos(x - 1, y)] || b[this.translatePos(x, y - 1)] || b[this.translatePos(x + 1, y)] || b[this.translatePos(x, y + 1)])) {
            throw "attempt to place tile not adjacent to existing tile: pos: " + (this.translatePos(x, y));
          }
        }
        if (b[this.translatePos(x, y)]) {
          throw "attempt to place tile over existing tile: pos: " + (this.translatePos(x, y)) + " tile: " + n + ", existing: " + b[this.translatePos(x, y)];
        } else {
          b[this.translatePos(x, y)] = n;
        }
        i += 1;
      }
      if (this.empty()) {
        centerX = (this.game.boardX - 1) / 2;
        centerY = (this.game.boardY - 1) / 2;
        if (!b[this.translatePos(centerX, centerY)]) {
          throw "opening move must have tile placed in center square (" + (this.translatePos(centerX, centerY)) + ")";
        }
        sm = this.sum((function() {
          var _k, _len2, _ref2, _results;
          _results = [];
          for (_k = 0, _len2 = ts.length; _k < _len2; _k++) {
            _ref2 = ts[_k], n = _ref2[0], x = _ref2[1], y = _ref2[2];
            _results.push(n);
          }
          return _results;
        })());
        if (sm % this.game.sumEqual !== 0) {
          throw "opening move sums to " + sm + ", which is not a multiple of " + this.game.sumEqual;
        }
      }
    };

    GameState.prototype.reorderTiles = function(b, adj_ts, ts) {
      var adj, change, n, n1, nadj_ts, x, x1, y, y1, _i, _j, _len, _len1, _ref, _ref1;
      if (ts.length === 0) {
        return adj_ts;
      }
      nadj_ts = [];
      change = false;
      for (_i = 0, _len = ts.length; _i < _len; _i++) {
        _ref = ts[_i], n = _ref[0], x = _ref[1], y = _ref[2];
        if (b[this.translatePos(x - 1, y)] || b[this.translatePos(x, y - 1)] || b[this.translatePos(x + 1, y)] || b[this.translatePos(x, y + 1)]) {
          change = true;
          adj_ts.unshift([n, x, y]);
        } else {
          adj = false;
          for (_j = 0, _len1 = adj_ts.length; _j < _len1; _j++) {
            _ref1 = adj_ts[_j], n1 = _ref1[0], x1 = _ref1[1], y1 = _ref1[2];
            if (y === y1) {
              if (x === x1 - 1 || x === x1 + 1) {
                adj = true;
              }
            } else if (x === x1 && (y === y1 - 1 || y === y1 + 1)) {
              adj = true;
            }
          }
          if (adj) {
            adj_ts.push([n, x, y]);
          } else {
            nadj_ts.push([n, x, y]);
          }
          if (adj) {
            change = adj;
          }
        }
      }
      if (change) {
        return this.reorderTiles(b, adj_ts, nadj_ts);
      } else {
        return adj_ts.concat(ts);
      }
    };

    GameState.prototype.checkBoard = function(b) {
      var i, l, ml, ms, mx, my, s, si, x, y, _i, _j, _results;
      ms = this.game.sumEqual;
      ml = this.game.maxLength;
      mx = this.game.boardX;
      my = this.game.boardY;
      y = 0;
      while (y < my) {
        x = 0;
        while (x < mx) {
          s = b[this.translatePos(x, y)];
          if (s) {
            l = 1;
            for (i = _i = 1; 1 <= ml ? _i <= ml : _i >= ml; i = 1 <= ml ? ++_i : --_i) {
              si = b[this.translatePos(x + i, y)];
              if (!si) {
                break;
              }
              s += si;
              l++;
            }
            if (l > ml) {
              throw "more than " + ml + " consecutive tiles in row " + y + " columns " + (this.translateCol(x)) + "-" + (this.translateCol(x + l - 1));
            }
            if (l > 1 && s % ms !== 0) {
              throw "consecutive tiles do not sum to multiple of " + ms + " in row " + y + " columns " + (this.translateCol(x)) + "-" + (this.translateCol(x + l - 1)) + " sum " + s;
            }
            x += l;
          }
          x++;
        }
        y++;
      }
      x = 0;
      _results = [];
      while (x < mx) {
        y = 0;
        while (y < my) {
          s = b[this.translatePos(x, y)];
          if (s) {
            l = 1;
            for (i = _j = 1; 1 <= ml ? _j <= ml : _j >= ml; i = 1 <= ml ? ++_j : --_j) {
              si = b[this.translatePos(x, y + i)];
              if (!si) {
                break;
              }
              s += si;
              l++;
            }
            if (l > ml) {
              throw "more than " + ml + " consecutive tiles in column " + (this.translateCol(x)) + " rows " + y + "-" + (y + l - 1);
            }
            if (l > 1 && s % ms !== 0) {
              throw "consecutive tiles do not sum to multiple of " + ms + " in row " + (this.translateCol(x)) + " columns " + y + "-" + (y + l - 1) + " sum " + s;
            }
            y += l;
          }
          y++;
        }
        _results.push(x++);
      }
      return _results;
    };

    GameState.prototype.useRackTile = function(rack, n) {
      var i, tile, _i, _len;
      for (i = _i = 0, _len = rack.length; _i < _len; i = ++_i) {
        tile = rack[i];
        if (tile === n) {
          rack.splice(i, 1);
          return;
        }
      }
      throw "attempt to use tile not in rack: tile: " + n + ", rack: " + rack;
    };

    return GameState;

  })();

  Game = (function() {
    Game.rackSize = 5;

    Game.maxLength = 5;

    Game.sumEqual = 5;

    Game.boardX = 17;

    Game.boardY = 17;

    Game.tileCounts = [0, 6, 6, 7, 10, 6, 10, 14, 12, 12, 7];

    Game.tiles = (function() {
      var amount, j, t, tile, _i, _j, _len, _ref;
      t = [];
      _ref = Game.tileCounts;
      for (tile = _i = 0, _len = _ref.length; _i < _len; tile = ++_i) {
        amount = _ref[tile];
        for (j = _j = 0; 0 <= amount ? _j < amount : _j > amount; j = 0 <= amount ? ++_j : --_j) {
          t.push(tile);
        }
      }
      return t;
    })();

    Game.randomSorter = function() {
      return 0.5 - Math.random();
    };

    function Game(players, opts) {
      var p;
      this.players = players;
      if (opts == null) {
        opts = {};
      }
      this.pass = __bind(this.pass, this);
      this.move = __bind(this.move, this);
      this.state = __bind(this.state, this);
      if (this.players.length < 2) {
        throw "must have at least 2 players";
      }
      this.init(opts);
      opts.tiles || (opts.tiles = Game.tiles.slice().sort(Game.randomSorter));
      opts.racks = (function() {
        var _i, _len, _ref, _results;
        _ref = this.players;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          _results.push([]);
        }
        return _results;
      }).call(this);
      opts.scores = (function() {
        var _i, _len, _ref, _results;
        _ref = this.players;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          p = _ref[_i];
          _results.push(0);
        }
        return _results;
      }).call(this);
      opts.lastMove = null;
      opts.lastRuns = null;
      opts.passCount = 0;
      opts.moveCount = -1;
      opts.gameOver = false;
      opts.board = {};
      opts.game = this;
      this.states = [new GameState(null, opts)];
    }

    Game.prototype.init = function(opts) {
      var k, v, _i, _len, _ref, _results;
      _ref = ['rackSize', 'maxLength', 'sumEqual', 'boardX', 'boardY'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        k = _ref[_i];
        if (v = opts[k]) {
          _results.push(this[k] = v);
        } else {
          _results.push(this[k] = Game[k]);
        }
      }
      return _results;
    };

    Game.prototype.state = function() {
      return this.states[this.states.length - 1];
    };

    Game.prototype.move = function(moves) {
      return this.states.push(this.state().move(moves));
    };

    Game.prototype.pass = function() {
      return this.states.push(this.state().pass());
    };

    return Game;

  })();

  if (typeof exports !== "undefined" && exports !== null) {
    exports.Player = Player;
    exports.Game = Game;
    exports.GameState = GameState;
  }

}).call(this);
