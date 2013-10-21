/**
    @module "ui/library-cell.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    MimeTypes = require("core/mime-types");

/**
    Description TODO
    @class module:"ui/library-cell.reel".LibraryCell
    @extends module:montage/ui/component.Component
*/
exports.LibraryCell = Montage.create(Component, /** @lends module:"ui/library-cell.reel".LibraryCell# */ {

    enterDocument: {
        value: function (firstTime) {
            if (firstTime) {
                this._element.addEventListener("dragstart", this, true);
            }
        }
    },

    icon: {
        value: null
    },

    prototypeObject: {
        value: null
    },

    captureDragstart: {
        value: function (event) {
            event.dataTransfer.effectAllowed = 'all';

            // Although we could use "application/json" here, the stage is
            // expecting a specific object type. We also might specially handle
            // "application/json" later.

            var transferObject = {
                serializationFragment: this.prototypeObject.serialization,
                htmlFragment: this.prototypeObject.html
            };

            event.dataTransfer.setData(MimeTypes.PROTOTYPE_OBJECT, JSON.stringify(transferObject));
            // A nice fallback if the user drags the component into an editor
            event.dataTransfer.setData("text/plain", this.prototypeObject.moduleId);

            var iconElement = this.icon.element;
            event.dataTransfer.setDragImage(
                iconElement,
                iconElement.width / 2,
                iconElement.height / 2
            );
        }
    },

    handlePrototypeButtonAction: {
        value: function (evt) {
            this.dispatchEventNamed("addComponent", true, true, {
                prototypeObject: this.prototypeObject
            });
        }
    }

});
