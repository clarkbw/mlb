// Manages the UI for showing the appCache state and button actions.

/*global window */

define(function (require) {
    'use strict';

    var $ = require('jquery'),
        appCache = require('appCache');

    // Return a function that can be called to do the DOM binding given a
    // jQuery DOM object to use as the parent container.
    return function uiAppCache(parentDom) {

        // Use the body element if no parentDom provided
        parentDom = parentDom || $('body');

        // Grab the DOM pieces used in the appCache UI
        var updateAlertDom = parentDom.find('.updateAlert');

        // when there is an update ready show the alert box
        appCache.on('updateready', function (evt) {
            updateAlertDom.show();
        });

        // Wire up appCache-related button.
        parentDom.find('.updateButton').on('click', function (evt) {
            appCache.swapCache();
            window.location.reload();
        });

        // run an appcache check on every load of the application
        appCache.update();
    };
});
