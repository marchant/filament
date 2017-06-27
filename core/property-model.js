var Montage = require("montage").Montage;

/**
 * A representation of a single property on an object. Can represent
 * properties with descriptors, custom properties, and bindings. Useful because
 * many parts of the component editor involve viewing and customizing an
 * object's properties.
 *
 * @class PropertyModel
 * @extends Montage
 */
exports.PropertyModel = Montage.specialize({

    /**
     * The proxy that the inspected property is defined on.
     *
     * @type {ReelProxy}
     */
    targetObject: {
        get: function () {
            return this._targetObject;
        },
        set: function (value) {
            this._targetObject = value;
        }
    },

    /**
     * The descriptor of the target object itself (not the property).
     *
     * @type {ObjectDescriptor}
     */
    targetObjectDescriptor: {
        get: function () {
            return this._targetObjectDescriptor;
        },
        set: function (value) {
            this._targetObjectDescriptor = value;
        }
    },

    /**
     * The name of the property, or the targetPath if the property is bound.
     *
     * @readonly
     * @type {String}
     */
    key: {
        get: function () {
            return this._key;
        }
    },

    /**
     * Alias for key.
     *
     * @type {String}
     */
    targetPath: {
        value: null
    },

    /**
     * The descriptor for the observed property, if there is one.
     *
     * @readonly
     * @type {PropertyDescriptor}
     */
    propertyDescriptor: {
        get: function () {
            return this._propertyDescriptor;
        }
    },

    /**
     * Whether the property is defined exclusively through serialization and
     * does not have a PropertyDescriptor.
     *
     * @type {Boolean}
     */
    isCustom: {
        value: null
    },

    /**
     * The value of the property on the targetObject. Setting will cause
     * changes to propagate to the object's editingDocument for serialization.
     *
     * @type {Any}
     */
    value: {
        get: function () {
            return this._value;
        },
        set: function (value) {
            if (this._value !== value && typeof value !== "undefined") {
                if (!(this._propertyDescriptor && this._propertyDescriptor.readOnly)) {
                    this.targetObject.editingDocument.setOwnedObjectProperty(this.targetObject, this._key, value);
                }
            }
            this._value = value;
        }
    },

    /**
     * Whether the key of this property (in practice, the targetPath of the
     * binding) is complex, i.e. is not just a simple (valid) property key.
     * This includes chaining (with .), FRB functions, arithmetic, concatenation,
     * higher order functions, boolean operators, scope operators (^), etc.
     * A model representing a complex binding cannot be reverted to a simple
     * unbound property.
     *
     * @example
     * "foo": not complex
     * "someKindOfProperty": not complex
     * "foo.bar": complex
     * "foo + bar": complex
     * "foo.filter{^baz == ban}": complex
     *
     * @readonly
     * @type {Boolean}
     */
    isKeyComplex: {
        get: function () {
            return !(/^[A-Za-z]+\w*$/.test(this.key));
        }
    },

    /**
     * @type {Boolean}
     */
    isBound: {
        value: null
    },

    /**
     * @type {Object}
     */
    bindingModel: {
        value: null
    },

    /**
     * @constructor
     *
     * @param {ReelProxy} targetObject The proxy being observed.
     * @param {ObjectDescriptor} targetObjectDescriptor The descriptor of the object being observed.
     * @param {String} key The name of the property or target path of the binding.
     */
    constructor: {
        value: function PropertyModel(targetObject, targetObjectDescriptor, key) {
            this.super();

            this.targetObject = targetObject;
            this.targetObjectDescriptor = targetObjectDescriptor;
            this._key = key;
            if (this.targetObjectDescriptor) {
                this._propertyDescriptor = this.targetObjectDescriptor.propertyDescriptorForName(key);
            }
            this.defineBinding("targetPath", {
                "<-": "key"
            });
            this.defineBinding("isCustom", {
                "<-": "!propertyDescriptor"
            });
            this.defineBinding("bindingModel", {
                "<-": "targetObject.bindings.filter{key == ^key}.0"
            });
            this.defineBinding("isBound", {
                "<-": "!!bindingModel"
            });
            this.addPathChangeListener("targetObject.properties.get(key)", this, "_valueChanged");
        }
    },

    _valueChanged: {
        value: function (value) {
            this._value = value;
        }
    },

    /**
     * Deletes the property from the target object's serialization and/or
     * ObjectDescriptor.
     */
    delete: {
        value: function () {
            this.cancelBinding();
            this.targetObject.deleteObjectProperty(this.key);
        }
    },

    /**
     * Creates a binding in place for this property. Does nothing if a binding
     * already exists.
     */
    convertToBinding: {
        value: function () {

        }
    },

    /**
     * Cancels an existing binding for this property, reverting it to an
     * unbound property. Does nothing if there is no binding to cancel or if
     * the binding is complex.
     */
    cancelBinding: {
        value: function () {
            if (this.isBound && !this.isKeyComplex) {
                this.targetObject.cancelObjectBinding(this.bindingModel);
            }
        }
    }
});