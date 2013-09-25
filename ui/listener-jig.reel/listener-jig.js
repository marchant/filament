/**
    @module "./listener-jig.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    defaultEventManager = require("montage/core/event/event-manager").defaultEventManager;

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

    _focusTimeout: {
        value: null
    },

    acceptsActiveTarget: {
        value: true
    },

    existingListener: {
        value: null
    },

    enterDocument: {
        value: function () {

            // We enter the document prior to the overlay presenting it
            if (!this.listenerModel) {
                return;
            }

            defaultEventManager.activeTarget = this;

            var self = this;
            this._focusTimeout = setTimeout(function () {
                self.templateObjects.typeField.element.focus();
            }, 100);
        }
    },

    exitDocument: {
        value: function () {
            clearTimeout(this._focusTimeout);
        }
    },

    shouldDismissOverlay: {
        value: function (overlay, target) {
            // don't dismiss the overlay if the user can drag the target
            while (target) {
                if (target.draggable) {
                    return false;
                }
                target = target.parentElement;
            }
            return true;
        }
    },

    handleUpdateEventListenerButtonAction: {
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
            this.existingListener = null;
            this.dispatchEventNamed("discard", true, false);
        }
    },

    _commitListenerEdits: {
        value: function () {
            var model = this.listenerModel,
                proxy = model.targetObject,
                type = model.type,
                listener = model.listener,
                useCapture = model.useCapture,
                methodName = model.methodName,
                listenerEntry;

            if (this.existingListener) {
                listenerEntry = this.editingDocument.updateOwnedObjectEventListener(proxy, this.existingListener, type, listener, useCapture);
            } else {
                listenerEntry = this.editingDocument.addOwnedObjectEventListener(proxy, type, listener, useCapture, methodName);
            }

            this.dispatchEventNamed("commit", true, false, {
                listenerEntry: listenerEntry
            });

            this.existingListener = null;
            this.listenerModel = null;
        }
    },

    handleAction: {
        value: function (evt) {
            var templateObjects = this.templateObjects,
                target = evt.target;

            if (target !== templateObjects.useCapture &&
                target !== templateObjects.useBubble) {

                this._commitListenerEdits();
            }
        }
    }

});
