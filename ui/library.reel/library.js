var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component;

exports.Library = Montage.create(Component, {

    groups: {
        value: null
    },

    groupsController: {
        value: null
    }

});
