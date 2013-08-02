/**
    @module "./listener-jig.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component;

/**
    Description TODO
    @class module:"./listener-jig.reel".ListenerJig
    @extends module:montage/ui/component.Component
*/
exports.ListenerJig = Montage.create(Component, /** @lends module:"./listener-jig.reel".ListenerJig# */ {

    editingDocument: {
        value: null
    },

    listenerModel: {
        value: null
    },

    handleAddListenerButtonAction: {
        value: function (evt) {
            evt.stop();
            this._commitListenerEdits();
        }
    },

    handleCancelButtonAction: {
        value: function (evt) {
            evt.stop();
            this._discardListenerEdits();
        }
    },

    handleKeyPress: {
        value: function(evt) {
            if ("cancelEditing" === evt.identifier) {
                this._discardListenerEdits();
            }
        }
    },

    _discardListenerEdits: {
        value: function () {
            this.listenerModel = null;
            this.dispatchEventNamed("discard", true, false);
        }
    },

    _commitListenerEdits: {
        value: function () {
            var model = this.listenerModel,
                target = model.targetObject,
                type = model.type,
                listener = model.listener,
                useCapture = model.useCapture,
                listenerEntry;

            //TODO provide support for updating an listener entry
            listenerEntry = this.editingDocument.addOwnedObjectEventListener(target, type, listener, useCapture);

            this.dispatchEventNamed("commit", true, false, {
                listenerEntry: listenerEntry
            });

            this.listenerModel = null;
        }
    },

    handleAction: {
        value: function (evt) {
            this._commitListenerEdits();
        }
    }

});
