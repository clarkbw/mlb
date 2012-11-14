// Defines the main app module. This one does the top level app wiring.

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, browser:true, es5:true, indent:2,
  maxerr:50, nomen:false */

'use strict';

define(function (require) {

  var $ = require('jquery'),
      Backbone = require('backbone'),
      moment = require('moment');

  require('app/uiWebAppInstall')();
  require('jquery.hammer');
  require('jqueryui/effect');
  require('jqueryui/effect-slide');
  require('bootstrap/transition');
  require('bootstrap/alert');
  require('bootstrap/collapse');
  require('bootstrap-datepicker');

  var _game = require("app/game"),
      GameListView = _game.ListView,
      GameList = _game.List;

  // Wait for the DOM to be ready before showing the network and appCache
  // state.
  $(function () {
    var MLBRouter = Backbone.Router.extend({
      routes: {
        ":year/:month/:day":    "date"
      },
    });

    Backbone.remotesync = Backbone.sync;
    Backbone.sync = function (method, model, options) {
      var gameID = 'games' + '-' + model.moment.format('YYYY-MM-DD');
      var games = null;
      var today = moment();

      // use localstorage to pull out previous game data while we download
      if ('localStorage' in window && window.localStorage !== null) {
        try {
          games = localStorage.getItem(gameID);
          if (games !== null) {
            options.success(JSON.parse(games));
          }
        } catch (e) { options.error("Game not found"); }
      }

      var resp = Backbone.remotesync(method, model, options);
      resp.done(function (data) {
        if ('localStorage' in window && window.localStorage !== null &&
            'data' in data && 'games' in data.data && 'game' in data.data.games) {
          try {
            localStorage.setItem(gameID, JSON.stringify(data));
          } catch (e) { console.log("error saving to local storage"); }
        }
        if (data) {
          options.success(data);
        } else {
          options.error("Game not found");
        }
      });
    };

    var Application = Backbone.View.extend({
      events : {
        "click #forward" : "clickGoForward",
        "click #backward" : "clickGoBackward",
      },
      initialize: function () {
        this.router = new MLBRouter();
        this.today = moment().startOf('day');

        this.gameDate = this.today.clone();
        this.gameDateDom = $("#date .txt");
        this.games = {};
        this.timerID = null;

        this.router.on("route:date", function (year, month, day) {
          //console.log("display", year, month, day);
          this.gameDate.startOf('day').year(year).month(month -= 1).date(day);
          this.games[this.gameDate] = new GameList({date : this.gameDate.toDate()});
          new GameListView({collection : this.games[this.gameDate], el : $('#games').empty().fadeIn()});

          if (this.gameDate.year() === this.today.year() &&
              this.gameDate.month() === this.today.month() &&
              this.gameDate.date() === this.today.date()) {  
            // on an interval do another fetch from the server for today's games
            this.timerID = window.setInterval(function () { this.games[this.gameDate].fetch(); }.bind(this),
                                              60 * 1000);
          } else {
            if (this.timerID !== null) {
              window.clearInterval(this.timerID);
              this.timerID = null;
            }
          }
  
          this.games[this.gameDate].fetch();
          this.render();

        }.bind(this), this);

        Backbone.history.start({pushState: false});
        this.go();
      },
      swipeGoForward : function swipeGoForward(ev) {
        var app = this;
        $("#games").hide("slide", { direction: "left" }, 1 * 1000,
                         function () { app.clickGoForward.call(app, ev); });
        return false;
      },
      clickGoForward : function clickGoForward(ev) {
        this.goForward();
        return false;
      },
      goForward : function goForward() {
        this.gameDate.add('days', 1);
        this.go();
      },
      swipeGoBackward : function swipeGoBackward(ev) {
        var app = this;
        $("#games").hide("slide", { direction: "right" }, 1 * 1000,
                         function () { app.clickGoBackward.call(app, ev); });
        return false;
      },
      clickGoBackward : function clickGoBackward(ev) {
        this.goBackward();
        return false;
      },
      goBackward : function goBackward() {
        this.gameDate.subtract('days', 1);
        this.go();
      },
      go : function () {
        this.router.navigate(this.gameDate.format('YYYY/MM/DD'), {trigger: true});
      },
      // must pass a moment object
      goDate : function goDate(m) {
        if (moment.isMoment(m)) {
          $("#games").fadeOut();
          this.gameDate = m;
          this.go();
        }
      },
      render: function () {
        this.gameDateDom.text(this.gameDate.format('LL'));
        return this;
      },
    });

    var MLBApp = new Application({el : $(".navbar")});

    // This handles date selection via swipes
    // swipe 'right' to go ahead one day
    // swipe 'left' to back one day
    $('body').hammer({ // hammer options go here
    }).bind('swipe', function (ev) {
      if (ev.direction === 'right') {
        MLBApp.swipeGoBackward();
      } else if (ev.direction === 'left') {
        MLBApp.swipeGoForward();
      }
    });

    $('#date')
      .data({ "date" : MLBApp.gameDate.format('YYYY/MM/DD'), "date-format" : "yyyy/mm/dd" })
      .datepicker({
        autoclose : true
      })
      .on('changeDate', function (ev) {
        var m = moment(new Date(ev.date));
        // for some reason we need to add a day
        m.add('days', 1);
        MLBApp.goDate(m);
      }
    );

  });
});
