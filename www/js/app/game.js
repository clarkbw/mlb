/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, browser:true, es5:true, indent:2,
  maxerr:50, nomen:false */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require) {
  var $       = require("jquery"),
      Backbone = require('backbone'),
      _        = require('underscore'),
      moment = require('moment');

  var MLB                      = 'mlb', // Major League Baseball
      AL                       = 'AL',  // American League
      NL                       = 'NL',  // National League
      CL                       = 'CL',  // Grapefruit League
      GL                       = 'GL',  // Cactus League
      WBC                      = 'WBC', // World Baseball Classic
      E                        = 'E';   // Exhibiton

  var mlbLeagueCodes = {
    '103' : AL,
    '104' : NL,
    '114' : CL,
    '115' : GL
  };

  // lame conversion of non-daylight savings timezone offsets
  var tzWinterOffsets = {
    'ET' : '-0500',
    'CT' : '-0600',
    'MT' : '-0700',
    'PT' : '-0800'
  };

  // lame conversion of daylight savings timezone offsets
  var tzSummerOffsets = {
    'ET' : '-0400',
    'CT' : '-0500',
    'MT' : '-0600',
    'PT' : '-0700'
  };

  var Game = Backbone.Model.extend({
    away : function () {
      var game = this;
      return {
        get : function (key) {
          return game.get("away_" + key);
        },
        runs : function () {
          try {
            if (game.is_before_game()) {
              return "-";
            }
            return parseInt(game.get("linescore").r.away, 10);
          } catch (nolinescore) {
            return "-";
          }
        }
      };
    },
    home : function () {
      var game = this;
      return {
        get : function (key) {
          return game.get("home_" + key);
        },
        runs : function () {
          try {
            if (game.is_before_game()) {
              return "-";
            }
            return parseInt(game.get("linescore").r.home, 10);
          } catch (nolinescore) {
            return "-";
          }
        }
      };
    },
    original_date : function () {
      return this.get("id").match(/^(\d{4}\/\d{2}\/\d{2})/, '$1')[1];
    },
    season : function () { return this.original_date().substr(0, 4); },

      // Start time to be determined (TBD)
    is_tbd : function () {
      return (this.get("time") === '3:33' && this.get("ampm") === 'AM');
    },

    game_number : function () { return this.get("id").substr(-1); },
    is_doubleheader : function () { return (this.get("game_number") === '2'); },

    linescore : function () {
      return this.get("linescore") || { r: {}, h: {}, e: {} };
    },
    linescore_inning : function () {
      return this.get("linescore").inning || [];
    },

    is_tied : function () {
      return (this.home().runs() === this.away().runs());
    },

    winning_team : function () {
      return (this.home().runs() > this.away().runs()) ?
              this.home().get("team_name") : this.away().get("team_name");
    },
    losing_team : function () {
      return (this.home().runs() < this.away().runs()) ?
              this.home().get("team_name") : this.away().get("team_name");
    },

    is_major_league    : function () {
      return (this.get("sport_code") === MLB);
    },
    league_code : function () {
      var code = this.get("league_id_spring") || this.get("league_id");
      return mlbLeagueCodes[code];
    },
    is_regular_season  : function () {
      return (this.get("game_type") === 'R');
    },
    is_first_round     : function () {
      return (this.get("game_type") === 'F');
    },
    is_division_series : function () {
      return (this.get("game_type") === 'D');
    },
    is_league_series   : function () {
      return (this.get("game_type") === 'L');
    },
    is_world_series    : function () {
      return (this.get("game_type") === 'W');
    },
    is_all_star_game   : function () {
      return (this.get("game_type") === 'A');
    },
    is_spring_training : function () {
      return (this.get("game_type") === 'S');
    },
    is_exhibition      : function () {
      return (this.get("game_type") === 'E');
    },
    is_19th_century    : function () {
      return (this.get("game_type") === 'N');
    },
    is_intrasquad      : function () {
      return (this.get("game_type") === 'I');
    },

    is_pre_season  : function () {
      return (this.is_spring_training() || this.is_exhibition());
    },
    is_post_season : function () {
      return (this.is_first_round() || this.is_division_series() ||
              this.is_league_series() || this.is_world_series());
    },

    is_scheduled        : function () {
      return (this.get("status").ind.charAt(0) === 'S');
    },
    is_pre_game         : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'P' && ind.charAt(1) === '');
    },
    is_delayed_start    : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'P' &&
              ind.charAt(1) !== '' &&
              ind.charAt(1) !== 'W');
    },
    is_before_game      : function () {
      return (this.is_scheduled() || this.is_pre_game() ||
              this.is_delayed_start());
    },

    is_warmup : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'P' && ind.charAt(1) === 'W');
    },
    is_in_progress : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'I' && ind.charAt(1) === '');
    },
    is_instant_replay : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'I' && ind.charAt(1) === 'H');
    },
    is_delayed : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'I' && ind.charAt(1) !== '');
    },
    is_suspended : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'U');
    },
    is_during_game : function () {
      return (this.is_warmup() || this.is_in_progress() ||
              this.is_delayed() || this.is_suspended());
    },

    is_over : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'O' && ind.charAt(1) === '');
    },
    is_completed_early : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'O' && ind.charAt(1) !== '');
    },
    is_final : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'F');
    },
    is_forfeit : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'R');
    },
    is_after_game : function () {
      return (this.is_over() || this.is_completed_early() ||
              this.is_final() || this.is_forfeit());
    },

    is_postponed : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'D');
    },
    is_cancelled : function () {
      var ind = this.get("status").ind;
      return (ind.charAt(0) === 'C');
    },
    is_nixed : function () {
      return (this.is_postponed() || this.is_cancelled());
    },

    is_top_of_inning : function () {
      return (this.get("status").top_inning === 'Y');
    },
    is_bottom_of_inning : function () {
      return (this.get("status").top_inning === 'N');
    },
    has_extra_innings : function () {
      var inning = this.get("status").inning;
      return inning > 9;
    },
    inning_ordinal : function () {
      return moment.ordinal(this.inning());
    },
    inning : function () {
      var inning = this.get("status").inning;
      if (inning) {
        return inning;
      }
      return "";
    },
    local_time : function () {
      // this is pretty broken, yay dates!
      var now = new Date();
      var m = moment(now.getFullYear() + "-" + (now.getMonth() + 1) + "-" +
                     now.getDate() + "-" +
                     this.home().get("time") + this.home().get("ampm") +
                     tzWinterOffsets[this.home().get("time_zone")],
                     "YYYY-MM-DD-h:mmA ZZ");
      return m.fromNow();
    },
    is_not_out : function () {
      return (this.outs() !== 3);
    },
    is_at_bat : function () {
      return (this.balls() !== 4 && this.strikes() !== 3);
    },
    balls : function () {
      return parseInt(this.get("status").b, 10);
    },
    strikes : function () {
      return parseInt(this.get("status").s, 10);
    },
    outs : function () {
      return parseInt(this.get("status").o, 10);
    }

  });

  var GameView = Backbone.View.extend({
    tagName:  "tr",
    className : "game",
    template : _.template($('#game-template').html()),
    initialize: function () {
      this.model.bind('reset', this.render, this);
    },
    render: function () {
      this.$el.html(this.template(this.model));
      return this;
    },
    events: {
    }
  });

  var GameList = Backbone.Collection.extend({
    model      : Game,
    initialize : function (options) {
      this.date = options.date || new Date();
      this.moment = moment(this.date);
      this.year = this.moment.format("YYYY");
      this.month = this.moment.format("MM");
      this.day = this.moment.format("DD");
    },
    url : function () {
      return "https://mlb-proxy.vcap.mozillalabs.com" +
              "/" + this.year + "/" + this.month + "/" + this.day;
      // XXX DEBUG
      //return "http://localhost:8811" +
    },
    parse: function (response) {
      return response.data.games.game;
    },
    comparator : function comparator(game1, game2) {
      if (game1.is_during_game()) {
        return -1;
      } else if (game2.is_during_game()) {
        return 1;
      }

      if (game1.is_before_game()) {
        return -1;
      } else if (game2.is_before_game()) {
        return 1;
      }
      return 0;
    }
  });

  var GameListView = Backbone.View.extend({
    initialize: function () {
      this.collection.bind('reset', this.render, this);
      $(".loading").fadeIn();
      $("#nogames").hide();
    },
    render: function () {
      // TODO: An app view should really handle this kind of stuff
      $(".loading").fadeOut("fast");
      this.$el.empty();
      this.collection.each(function (game, i) {
        var view = new GameView({model: game});
        this.$el.append(view.render().$el);
      }.bind(this));
      $("#nogames").toggle(this.collection.length <= 0);
      return this;
    }
  });

  //The value returned from the function is
  //used as the module export visible to Node.
  return { Model : Game, ModelView : GameView,
           List : GameList, ListView : GameListView };
});
