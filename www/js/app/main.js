// Defines the main app module. This one does the top level app wiring.

/*jshint forin:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true,
  strict:true, undef:true, curly:true, browser:true, es5:true, indent:2,
  maxerr:50, nomen:false */


define(function (require) {

  var $ = require('jquery'),
      _ = require("underscore"),
      Backbone = require("backbone"),
      install = require('install'),
      $mobile = require("jquery.mobile-1.2.0"),
      enabledClick = false;

  function onInstallStateChange() {
    //Make sure DOM is ready before modifying it.
    $(function () {
      var dom = $('body'),
          installDom = dom.find('.webapp-install');

      if (install.state === 'installed' || install.state === 'unsupported') {
        installDom.hide();
          //Remove any even listener for the install button.
        dom.off('click', '.webapp-install', install);
        enabledClick = false;

      } else if (install.state === 'uninstalled') {
        // Installed now so no need to show the install button.
        installDom.show();

        if (!enabledClick) {
          dom.on('click', '.webapp-install', install);

          dom.find('.ios').on('click', function () {
            //Close out the ios panel when clicked.
            $(this).fadeOut();
          });

          enabledClick = true;
        }
      }
    });
  }

  var _game = require("app/game"),
      GameListView = _game.ListView,
      GameList = _game.List;

  // Wait for the DOM to be ready before showing the network and appCache
  // state.
  $(function () {
    install.on('change', onInstallStateChange);

    var GameDay = new GameList();
    var GameDayView = new GameListView({collection : GameDay,
                                       el : $("#games")});

    // use localstorage to pull out previous game data while we download
    if ('localStorage' in window && window.localStorage !== null) {
      var games = localStorage.getItem("games");
      if (games) {
        GameDay.reset(JSON.parse(games));
      }
    }

    // set the jquery-mobile properties
    $(document).bind("mobileinit", function () {
        // Make your jQuery Mobile framework configuration changes here!
      $.mobile.autoInitializePage = false;
      $.mobile.touchOverflowEnabled = true;
      $.event.special.swipe.horizontalDistanceThreshold = "100px";
    });

    // Swipe left means go forward one day
    $(document).bind("swipeleft", function () {
      //alert("swipeleft");
    });

    // Swipe right means go back one day
    $(document).bind("swiperight", function () {
      //alert("swiperight");
    });

    // the Backbon.Collection.fetch() options
    var fetch = {
      success : function success(collection, response) {
        // If localstorage exists save our data so we can retrive it later
        if ('localStorage' in window && window.localStorage !== null) {
          localStorage.setItem("games", JSON.stringify(collection.toJSON()));
        }
      }
    };

    // every 45 seconds do another fetch from the server
    window.setInterval(function () { GameDay.fetch(fetch); }, 45 * 1000);

    // Run an immediate fetch now
    GameDay.fetch(fetch);

    // check immediately for installation to show/hide the install button
    onInstallStateChange();
  });
});
