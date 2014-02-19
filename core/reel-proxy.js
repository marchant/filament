var EditingProxy = require("palette/core/editing-proxy").EditingProxy,
    Map = require("montage/collections/map"),
    NodeProxy = require("core/node-proxy").NodeProxy,
    BUILDER_UNIT_LABEL = "_dev";

/**
 * The ReelProxy is an EditingProxy for objects that can be declared in a component's template.
 * This describes any Montage object such as visual components or non-visual controllers.
 *
 * Combined with the overarching EditingDocument the EditingProxies make up what can be
 * referred to as the EditingModel.
 *
 * While there may be a visual representation of the ReelProxy rendered somewhere in an editor
 * the authoritative model that is used to render the final output of the EditingDocument is
 * captured in the EditingModel alone.
 *
 * Editors of rich objects may need to interact with live objects to provide a
 * friendly editing experience. In this case, the editor must take up the burden of
 * performing edits through whatever APIs make the most sense at the time in addition to
 * writing the final changes to the affected EditingProxies. Again, if changes are not
 * captured by EditingProxies the changes are not known to the EditingModel.
 *
 * EditingProxies are not typically intended to be edited directly, though they do provide
 * methods to do so. Instead the EditingDocument, which houses a collection of EditingProxies,
 * exposes editing APIs which emit editing events and are recorded on included UndoManager.
 *
 * The editing methods on the EditingProxies is reserved for use by the EditingDocument itself
 * or any other editing which should circumvent the usual event emitting and undo recording;
 * even this usage is not currently advised.
 * @type {ReelProxy}
 */
var ReelProxy = exports.ReelProxy = EditingProxy.specialize( {

    constructor: {
        value: function ReelProxy() {
            this.super();
        }
    },

    bindingChangesDispatchingEnabled: {
        value: true
    },

    eventListenerChangesDispatchingEnabled: {
        value: true
    },

    /**
     * The identifier of the representedObject
     */
    identifier: {
        get: function () {
            return this.getPath("properties.get('identifier')") || this.label;
        },
        set: function (value) {
            if (value !== this.identifier) {
                this.setObjectProperty("identifier", value);
            }
        }
    },

    /**
     * The live object this editingProxy is representing
     * @note Edits made to the proxy are set on the live objects, this may not be the case forever
     * as there's really no way to know whether setting properties in a declaration translates
     * to setting values at runtime without issue.
     * @deprecated Don't use this for anything. I intend to remove this property to further decouple
     * the editing model from the live representation with the intent of being able to have a single
     * editingModel presented by several live presentations in different contexts at the same time;
     * there will be no definitive live representation to supply the editing model with.
     */
    stageObject: {
        value: null
    },


    setObjectProperty: {
        value: function (property, value, dispatchPropertiesChange) {
            var previous = this.properties.get(property);
            if (previous instanceof NodeProxy) {
                this.editingDocument.references.delete(previous, this, property);
            }

            // The value being set here should always be something of worth to the
            // editingModel, in contrast to what we do later if we have live
            // representations to update as well
            this.super(property, value, dispatchPropertiesChange);

            if (value instanceof NodeProxy) {
                this.editingDocument.references.add(value, this, property);
            }

            if (this.stageObject) {
                // At this point, we're setting values in a live application;
                // objects need to be part of that application, not the editingModel

                //TODO there are probably other scenarios where this arises and we need to find the non-editingModel value to pass along
                value = value instanceof ReelProxy ? value.stageObject : value;

                if (this.stageObject.setPath) {
                    this.stageObject.setPath(property, value);
                } else if (this.stageObject.setProperty) {
                    this.stageObject.setProperty(property, value);
                }
            }
        }
    },

    editorMetadata: {
        value: null
    },

    setEditorMetadata: {
        value: function (property, value) {
            if (("comment" === property || "isHidden" === property) && !value) {
                this.editorMetadata.delete(property);
            } else {
                this.editorMetadata.set(property, value);
            }
        }
    },

    getEditorMetadata: {
        value: function (property) {
            return this.editorMetadata.get(property);
        }
    },

    /**
     * Initialize an ReelProxy suitable for editing
     *
     * @param {string} label The label for the represented object within a template
     * @param {object} serialization The revived serialization of the represented object
     * @param {string} exportId The string used as the exportId of the represented object if none is found in the serialization
     * @param {boolean} isUserObject Whether this object is provided by by the user of the template
     */
    init: {
        //TODO not pass along a reference to the editingDocument as part of the proxy itself
        // it's being done out of convenience to help out the inspector but I'm not sure I like
        // that
        value: function (label, serialization, exportId, editingDocument, isUserObject) {

            if (!isUserObject && !exportId && !serialization.prototype && !serialization.object) {
                throw new Error("No exportId provided or found for template object with label '" + label + "'");
            }

            if (exportId && serialization.prototype && exportId !== serialization.prototype) {
                throw new Error("Conflicting serialization prototype and exportId values provided template object with label '" + label + "'");
            }

            if (serialization.object && serialization.prototype) {
                throw new Error("Serialization for object with label '" + label + "' cannot have both 'prototype' and 'object' attributes");
            }

            //TODO make sure that if the serialization specifically had no prototype, we don't go and write one in when saving

            var self = EditingProxy.init.call(this, label, serialization, exportId, editingDocument);
            self._exportId = exportId || serialization.prototype || serialization.object;
            self._isUserObject = isUserObject;

            this.defineBinding("isInTemplate", {"<-": "_editingDocument.editingProxies.has($)", parameters: this});

            self.properties.forEach(function (value, property) {
                if (value instanceof NodeProxy) {
                    editingDocument.references.add(value, self, property);
                }
            }, self);

            return self;
        }
    },

    _populateWithSerialization: {
        value: function (serialization) {
            this.super(serialization);

            var bindings = [];
            for (var key in serialization.bindings) {
                if (serialization.bindings.hasOwnProperty(key)) {
                    var bindingEntry = serialization.bindings[key];
                    var bindingDescriptor = Object.create(null);

                    bindingDescriptor.targetPath = key;
                    bindingDescriptor.oneway = ("<-" in bindingEntry);
                    bindingDescriptor.sourcePath = bindingDescriptor.oneway ? bindingEntry["<-"] : bindingEntry["<->"];
                    /* TODO the converter seems to be maintaining state */
                    if (bindingEntry.converter) {
                        bindingDescriptor.converter = bindingEntry.converter;
                    }

                    bindings.push(bindingDescriptor);
                }
            }
            this._bindings = bindings;

            var listeners = [],
                listenerDescriptor;

            if (serialization.listeners) {
                listeners = serialization.listeners.map(function (listenerEntry) {
                    listenerDescriptor = Object.create(null);

                    //TODO resolve the listener reference
                    listenerDescriptor.listener = listenerEntry.listener;
                    listenerDescriptor.type = listenerEntry.type;
                    listenerDescriptor.useCapture = listenerEntry.useCapture;
                    return listenerDescriptor;
                });
            }
            this._listeners = listeners;

            this.editorMetadata = new Map(serialization[BUILDER_UNIT_LABEL]);
        }
    },

    _isUserObject: {
        value: false
    },

    /**
     * Whether or not this proxy represents an object that was provided by
     * the user of the template. This indicates that the object will not
     * have a `prototype` or `object` entry when serialized.
     */
    isUserObject: {
        get: function () {
            return this._isUserObject;
        }
    },

    /**
     * Whether this is currently in the template. Will be false if it has
     * been deleted. Updated through a binding.
     * @type {boolean}
     */
    isInTemplate: {
        value: false
    },

    _bindings: {
        value: null
    },

    /**
     * The collection of bindings associated with the object this proxy represents
     */
    bindings: {
        get: function () {
            return this._bindings;
        }
    },

    _listeners: {
        value: null
    },

    /**
     * The collection of listeners observing the object this proxy represents
     */
    listeners: {
        get: function () {
            return this._listeners;
        }
    },

    defineObjectBinding: {
        value: function (targetPath, oneway, sourcePath, converter) {
            var binding = Object.create(null);

            //TODO guard against binding to the exact same targetPath twice
            binding.targetPath = targetPath;
            binding.oneway = oneway;
            binding.sourcePath = sourcePath;
            binding.converter = converter;

            this.bindings.push(binding);
            this._dispatchDidSetObjectBinding(binding);

            return binding;
        }
    },

    /**
     * Update an existing binding with new parameters
     *
     * All parameters are required, currently you cannot update a single
     * property of the existing binding without affecting the others.
     *
     * @param {Object} binding The existing binding to update
     * @param {string} targetPath The targetPath to set on the binding
     * @param {boolean} oneway Whether or not to set the binding as being oneway
     * @param {string} sourcePath The sourcePath to set on the binding
     * @param {string} converter The converter to set on the binding
     */
    updateObjectBinding: {
        value: function (binding, targetPath, oneway, sourcePath, converter) {
            var existingBinding,
                bindingIndex = this.bindings.indexOf(binding),
                newTargetPropertyBinding;

            if (bindingIndex > -1) {
                existingBinding = binding;
            } else {
                throw new Error("Cannot update a binding that's not associated with this proxy.");
            }

            if (targetPath !== binding.targetPath) {
                newTargetPropertyBinding = true;
            }

            binding.targetPath = targetPath;
            binding.oneway = oneway;
            binding.sourcePath = sourcePath;
            binding.converter = converter;

            if (newTargetPropertyBinding) {
                this._dispatchDidCancelObjectBinding(binding);
            }
            this._dispatchDidSetObjectBinding(binding);

            return binding;
        }
    },

    /**
     * Add a a specified binding object to the proxy at a specific index
     * in the bindings collection
     */
    addBinding: {
        value: function (binding, insertionIndex) {
            var bindingIndex = this.bindings.indexOf(binding);

            if (-1 === bindingIndex) {
                if (isNaN(insertionIndex)) {
                    this.bindings.push(binding);
                } else {
                    this.bindings.splice(insertionIndex, 0, binding);
                }
                this._dispatchDidSetObjectBinding(binding);
            } else {
                //TODO guard against adding exact same binding to multiple proxies
                throw new Error("Cannot add the same binding to a proxy more than once");
            }

            return binding;
        }
    },

    /**
     * Add a specified listener object to the proxy at a specific index
     * in the listeners collection, used for undoability not new listeners
     */
    addEventListener: {
        value: function (listener, insertionIndex) {
            var listenerIndex = this.listeners.indexOf(listener);

            if (-1 === listenerIndex) {
                if (isNaN(insertionIndex)) {
                    this.listeners.push(listener);
                } else {
                    this.listeners.splice(insertionIndex, 0, listener);
                }
            } else {
                //TODO guard against adding exact same listener to multiple proxies
                throw new Error("Cannot add the same listener to a proxy more than once");
            }

            return listener;
        }
    },

    /**
     * Remove the specific binding from the set of active bindings on this proxy
     *
     * @return {Object} an object with two keys index and removedBinding
     */
    cancelObjectBinding: {
        value: function (binding) {
            var bindingIndex = this.bindings.indexOf(binding);

            if (bindingIndex > -1) {
                this.bindings.splice(bindingIndex, 1);
                this._dispatchDidCancelObjectBinding(binding);
                return {index: bindingIndex, removedBinding: binding};
            } else {
                throw new Error("Cannot cancel a binding that's not associated with this proxy");
            }
        }
    },

    addObjectEventListener: {
        value: function (type, listener, useCapture) {
            var listenerModel = Object.create(null);

            //TODO check for duplicate entry already registered

            listenerModel.type = type;
            listenerModel.listener = listener;
            listenerModel.useCapture = useCapture;

            this.listeners.push(listenerModel);
            this._dispatchDidAddObjectEventListener(listenerModel);

            return listenerModel;
        }
    },

    /**
     * Update an existing listener with new parameters
     *
     * All parameters are required, currently you cannot update a single
     * property of the existing listener without affecting the others.
     *
     * @param {Object} listener The existing listener to update
     * @param {string} type
     * @param {Object} itsListener
     * @param {string} useCapture
     */
    updateObjectEventListener: {
        value: function (listener, type, itsListener, useCapture) {
            var existinglistener,
                listenerIndex = this.listeners.indexOf(listener);

            if (listenerIndex > -1) {
                existinglistener = listener;
            } else {
                throw new Error("Cannot update a listener that's not associated with this proxy.");
            }

            this._dispatchWillUpdateObjectEventListener(listener);

            listener.type = type;
            listener.listener = itsListener;
            listener.useCapture = useCapture;

            this._dispatchDidUpdateObjectEventListener(listener);

            return listener;
        }
    },

    /**
     * Remove the specific listener from the set of active listeners on this proxy
     *
     * @return {Object} an object with two keys index and removedListener
     */
    removeObjectEventListener: {
        value: function (listener) {
            var listenerIndex = this.listeners.indexOf(listener);

            if (listenerIndex > -1) {
                this.listeners.splice(listenerIndex, 1);
                this._dispatchDidRemoveObjectEventListener(listener);
                return {index: listenerIndex, removedListener: listener};
            } else {
                throw new Error("Cannot remove a listener that's not associated with this proxy");
            }
        }
    },

    _dispatchDidSetObjectBinding: {
        value: function(binding) {
            if (this.bindingChangesDispatchingEnabled) {
                this.dispatchEventNamed("didSetObjectBinding", true, false, {
                    binding: binding
                });
            }
        }
    },

    _dispatchDidCancelObjectBinding: {
        value: function(binding) {
            if (this.bindingChangesDispatchingEnabled) {
                this.dispatchEventNamed("didCancelObjectBinding", true, false, {
                    binding: binding
                });
            }
        }
    },

    _dispatchDidAddObjectEventListener: {
        value: function(listenerModel) {
            if (this.eventListenerChangesDispatchingEnabled) {
                this.dispatchEventNamed("didAddObjectEventListener", true, false, {
                    listenerModel: listenerModel
                });
            }
        }
    },

    _dispatchDidRemoveObjectEventListener: {
        value: function(listenerModel) {
            if (this.eventListenerChangesDispatchingEnabled) {
                this.dispatchEventNamed("didRemoveObjectEventListener", true, false, {
                    listenerModel: listenerModel
                });
            }
        }
    },

    _dispatchWillUpdateObjectEventListener: {
        value: function(listenerModel) {
            if (this.eventListenerChangesDispatchingEnabled) {
                this.dispatchEventNamed("willUpdateObjectEventListener", true, false, {
                    listenerModel: listenerModel
                });
            }
        }
    },

    _dispatchDidUpdateObjectEventListener: {
        value: function(listenerModel) {
            if (this.eventListenerChangesDispatchingEnabled) {
                this.dispatchEventNamed("didUpdateObjectEventListener", true, false, {
                    listenerModel: listenerModel
                });
            }
        }
    }
});
