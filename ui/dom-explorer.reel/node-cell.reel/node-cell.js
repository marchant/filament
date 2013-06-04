/**
    @module "./node-cell.reel"
    @requires montage
    @requires montage/ui/component
*/
var Montage = require("montage").Montage,
    Component = require("montage/ui/component").Component,
    MimeTypes = require("core/mime-types");

/**
    Description TODO
    @class module:"./node-cell.reel".NodeCell
    @extends module:montage/ui/component.Component
*/
exports.NodeCell = Montage.create(Component, /** @lends module:"./node-cell.reel".NodeCell# */ {

    _nodeInfo: {
        value: null
    },
    nodeInfo: {
        get: function() {
            return this._nodeInfo;
        },
        set: function(value) {
            if (this._nodeInfo === value) {
                return;
            }

            if (this._nodeInfo) {
                this._nodeInfo.removeOwnPropertyChangeListener("depth", this);
            }

            this._nodeInfo = value;

            if (value) {
                value.addOwnPropertyChangeListener("depth", this);
            }

            this.needsDraw = true;
        }
    },

    handleDepthChange: {
        value: function () {
            this.needsDraw = true;
        }
    },

    draw: {
        value: function () {
            this.element.style.marginLeft = (20 * this.getPath("nodeInfo.depth")) + 'px';
        }
    },

    enterDocument: {
        value: function (firstTime) {
            if (!firstTime) { return; }
            this._element.addEventListener("dragstart", this);
            this._element.addEventListener("dragover", this, false);
            this._element.addEventListener("drop", this, false);
        }
    },

    handleDragstart: {
        value: function (event) {
            var montageId = this.nodeInfo.montageId;
            if (montageId) {
                event.dataTransfer.effectAllowed = 'all';

                event.dataTransfer.setData(MimeTypes.MONTAGE_TEMPLATE_ELEMENT, montageId);
                event.dataTransfer.setData("text/plain", '{"#": "' + montageId + '"}');
            }
        }
    },

    handleDragover: {
        enumerable: false,
        value: function (event) {
            if (
                event.dataTransfer.types &&
                event.dataTransfer.types.indexOf(MimeTypes.PROTOTYPE_OBJECT) !== -1 &&
                !this.nodeInfo.component
            ) {
                // allows us to drop
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
            } else {
                event.dataTransfer.dropEffect = "none";
            }
        }
    },

    handleDrop: {
        enumerable: false,
        value: function (event) {
            // TODO: security issues?
            var data = event.dataTransfer.getData(MimeTypes.PROTOTYPE_OBJECT),
                transferObject = JSON.parse(data),
                stageElement = null,
                nodeInfo = this.nodeInfo;

            // The parent element to "append" the new html to. This actually
            // already contains the element we want to use, so we just have
            // to change the serializationFragment to match the montageId
            stageElement = this.nodeInfo._editingDocument._editingController.owner.element;

            var properties = transferObject.serializationFragment.properties;
            if (properties && properties.element) {
                properties.element["#"] = this.nodeInfo._templateNode.dataset.montageId;
            }

            nodeInfo.dispatchBeforeOwnPropertyChange("component", nodeInfo.component);
            this.nodeInfo._editingDocument.DEMOinsertLibraryItem(transferObject.serializationFragment, this.nodeInfo._templateNode, stageElement).then(function (addedObjects) {
                nodeInfo.dispatchOwnPropertyChange("component", nodeInfo.component);
            }).done();
        }
    },

    handleRemoveNodeButtonAction: {
        value: function (evt) {
            this.dispatchEventNamed("removeNode", true, true, this.nodeInfo);
        }
    },

    handleAppendNodeButtonAction: {
        value: function (evt) {
            //TODO prompt for tagName
            this.dispatchEventNamed("appendNode", true, true, {
                parentNode: this.nodeInfo,
                tagName: "div"
            });
        }
    },

    handleInsertBeforeNodeButtonAction: {
        value: function (evt) {
            //TODO prompt for tagName
            this.dispatchEventNamed("insertBeforeNode", true, true, {
                nextSibling: this.nodeInfo,
                tagName: "div"
            });
        }
    },

    handleInsertAfterNodeButtonAction: {
        value: function (evt) {
            //TODO prompt for tagName
            this.dispatchEventNamed("insertAfterNode", true, true, {
                previousSibling: this.nodeInfo,
                tagName: "div"
            });
        }
    }

});
