/**
    @module "./template-explorer.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

/**
    Description TODO
    @class module:"./template-explorer.reel".TemplateExplorer
    @extends module:montage/ui/component.Component
*/
exports.TemplateExplorer = Montage.create(Component, /** @lends module:"./template-explorer.reel".TemplateExplorer# */ {

    templatesObjects: {
        value: null
    },

    selectedObjects: {
        value: null
    },

    templatesObjectsController: {
        value: null
    }

});
