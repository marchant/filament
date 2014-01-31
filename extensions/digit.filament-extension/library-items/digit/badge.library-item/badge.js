/* globals module */
var LibraryItem = require("filament-extension/core/library-item").LibraryItem;

var moduleLocation = module.location.replace(/[^\/]+.js$/m, "");

exports.Badge = LibraryItem.specialize({

    constructor: {
        value: function BadgeLibraryItem () {
            this.super();
        }
    },

    name: {
        value: "Badge"
    },

    description: {
        value: "Displays whole numbers and can be used as a notification counter."
    },

    iconUrl: {
        value: moduleLocation + "badge.png"
    }

});
