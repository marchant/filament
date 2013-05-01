/**
    @module "./dom-explorer.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

/**
    Description TODO
    @class module:"./dom-explorer.reel".DomExplorer
    @extends module:montage/ui/component.Component
*/
exports.DomExplorer = Montage.create(Component, /** @lends module:"./dom-explorer.reel".DomExplorer# */ {

    templateObjectsController: {
        value: null
    },

    editingDocument: {
        value: null
    },

    nodeTreeController: {
        value: null
    },

    handleRemoveNode: {
        value: function (evt) {
            this.editingDocument.removeTemplateNode(evt.detail);
        }
    },

    handleAppendNode: {
        value: function (evt) {
            var newNode = this.editingDocument.createTemplateNode(evt.detail.tagName);
            this.editingDocument.appendChildToTemplateNode(newNode, evt.detail.parentNode);
        }
    }

});
