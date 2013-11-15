/**
 * @module ui/add-element.reel
 * @requires montage/ui/component
 */
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    MimeTypes = require("core/mime-types");

/**
 * @class AddElement
 * @extends module:montage/ui/component.Component
 */
exports.AddElement = Montage.create(Component, /** @lends AddElement# */ {

    type: {
        value: null
    },

    isDropTarget: {
        value: false
    },

    prepareForActivationEvents: {
        value: function () {
            this.super();
        }
    },

    enterDocument: {
        value: function (firstTime) {
            this.super(firstTime);

            if (!firstTime) { return; }
            this.defineBinding("classList.has('AddElement--dropTarget')", {"<-": "isDropTarget"});

            var element = this.element.querySelector("div.AddElement-segment");
            element.addEventListener("dragover", this, false);
            element.addEventListener("dragenter", this, false);
            element.addEventListener("dragleave", this, false);
            element.addEventListener("drop", this, false);
        }
    },

    acceptsInsertionDrop: {
        value: function (evt) {
            var types = evt.dataTransfer.types;
            return types &&
                (
                    types.indexOf(MimeTypes.PROTOTYPE_OBJECT) !== -1 ||
                    types.indexOf(MimeTypes.HTML_ELEMENT) !== -1
                );
        }
    },

    acceptsMoveDrop: {
        value: function (evt) {
            var types = evt.dataTransfer.types;
            return types &&
                (
                    types.indexOf(MimeTypes.MONTAGE_TEMPLATE_ELEMENT) !== -1 ||
                    types.indexOf(MimeTypes.MONTAGE_TEMPLATE_XPATH) !== -1
                );
        }
    },

    handleDragover: {
        enumerable: false,
        value: function (evt) {
            if (this.acceptsInsertionDrop(evt)) {
                evt.preventDefault();
                evt.dataTransfer.dropEffect = "copy";
            } else if (this.acceptsMoveDrop(evt)) {
                evt.preventDefault();
                evt.dataTransfer.dropEffect = "copy";
            } else {
                evt.dataTransfer.dropEffect = "none";
            }
        }
    },

    handleDragenter: {
        enumerable: false,
        value: function (evt) {
            if (this.acceptsInsertionDrop(evt)) {
                this.isDropTarget = true;
            }
        }
    },

    handleDragleave: {
        value: function (evt) {
            if (this.acceptsInsertionDrop(evt)) {
                this.isDropTarget = false;
            }
        }
    },

    handleDrop: {
        enumerable: false,
        value: function (evt) {
            var dataTransfer = evt.dataTransfer,
                types = dataTransfer.types;
            evt.stop();

            if (types.indexOf(MimeTypes.HTML_ELEMENT) !== -1) {
                // insert new element from html string
                var html = dataTransfer.getData(MimeTypes.HTML_ELEMENT);
                this.dispatchEventNamed("insertElementAction", true, true, {
                    htmlElement: html
                });
            } else if (types.indexOf(MimeTypes.PROTOTYPE_OBJECT) !== -1) {
                // insert new element from
                // TODO: security issues?
                var data = dataTransfer.getData(MimeTypes.PROTOTYPE_OBJECT),
                    transferObject = JSON.parse(data);

                this.dispatchEventNamed("insertTemplateAction", true, true, {
                    transferObject: transferObject
                });
            } else if (types.indexOf(MimeTypes.MONTAGE_TEMPLATE_ELEMENT) !== -1) {
                // move a component
                var montageId = dataTransfer.getData(MimeTypes.MONTAGE_TEMPLATE_ELEMENT);
                this.dispatchEventNamed("moveTemplate", true, true, {
                    montageId: montageId
                });
            } else if (types.indexOf(MimeTypes.MONTAGE_TEMPLATE_XPATH) !== -1) {
                // move an HTML node
                var xpath = dataTransfer.getData(MimeTypes.MONTAGE_TEMPLATE_XPATH);
                this.dispatchEventNamed("moveTemplate", true, true, {
                    xpath: xpath
                });
            }
            this.isDropTarget = false;
            this.dispatchEventNamed("addelementout", true, true);
        }
    }
});