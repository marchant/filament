var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    MimeTypes = require("core/mime-types"),
    replaceDroppedTextPlain = require("ui/drag-and-drop").replaceDroppedTextPlain,
    Promise = require("montage/core/promise").Promise,
    defaultEventManager = require("montage/core/event/event-manager").defaultEventManager;

exports.BindingJig = Montage.create(Component, {

    _focusTimeout: {
        value: null
    },

    acceptsActiveTarget: {
        value: true
    },

    enterDocument: {
        value: function () {

            // We enter the document prior to the overlay presenting it
            if (!this.bindingModel) {
                return;
            }

            this.templateObjects.sourcePath.element.addEventListener("drop", this, false);

            defaultEventManager.activeTarget = this;

            var self = this;
            this._focusTimeout = setTimeout(function () {
                self.templateObjects.targetPath.element.focus();
            }, 100);
        }
    },

    exitDocument: {
        value: function () {
            this.templateObjects.sourcePath.element.removeEventListener("drop", this, false);
            clearTimeout(this._focusTimeout);
        }
    },

    editingDocument: {
        value: null
    },

    bindingModel: {
        value: null
    },

    existingBinding: {
        value: null
    },

    handleDrop: {
        value: function (event) {
            if (event.dataTransfer.types.has(MimeTypes.SERIALIZATION_OBJECT_LABEL)) {
                var element = this.inputEl;
                var plain = event.dataTransfer.getData("text/plain");
                var rich = "@" + event.dataTransfer.getData(MimeTypes.SERIALIZATION_OBJECT_LABEL);
                replaceDroppedTextPlain(plain, rich, this.templateObjects.sourcePath.element);
            }
        }
    },

    handleDefineBindingButtonAction: {
        value: function (evt) {
            evt.stop();
            this._commitBindingEdits();
        }
    },

    handleCancelButtonAction: {
        value: function (evt) {
            evt.stop();
            this._discardBindingEdits();
        }
    },

    handleKeyPress: {
        value: function(evt) {
            if ("cancelEditing" === evt.identifier) {
                this._discardBindingEdits();
            }
        }
    },

    handleAction: {
        value: function (evt) {
            this._commitBindingEdits();
        }
    },

    _discardBindingEdits: {
        value: function () {
            this.bindingModel = null;
            this.existingBinding = null;
            this.dispatchEventNamed("discard", true, false);
        }
    },

    _commitBindingEdits: {
        value: function () {
            var model = this.bindingModel,
                proxy = model.targetObject,
                targetPath = model.targetPath,
                oneway = model.oneway,
                sourcePath = model.sourcePath,
                bindingEntry;

            if (this.existingBinding) {
                bindingEntry = this.editingDocument.updateOwnedObjectBinding(proxy, this.existingBinding, targetPath, oneway, sourcePath);
            } else {
                bindingEntry = this.editingDocument.defineOwnedObjectBinding(proxy, targetPath, oneway, sourcePath);
            }


            this.dispatchEventNamed("commit", true, false, {
                bindingEntry: bindingEntry
            });

            this.existingBinding = null;
            this.bindingModel = null;
        }
    }

});
