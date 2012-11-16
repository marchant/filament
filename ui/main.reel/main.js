var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component,
    Connection = require("q-comm");

var IS_IN_LUMIERES = (typeof lumieres !== "undefined");

exports.Main = Montage.create(Component, {

    prototypes: {
        value: require("palette/core/components.js").components
    },

    currentProject: {
        value: null
    },

    _environmentBridge: {
        value: null
    },

    environmentBridge: {
        get: function () {
            return this._environmentBridge;
        },
        set: function (value) {
            if (value === this._environmentBridge) {
                return;
            }

            if (this._environmentBridge) {
                this._environmentBridge.didExitEnvironment(this);
            }

            this._environmentBridge = value;

            if (this._environmentBridge) {
                this._environmentBridge.didEnterEnvironment(this);
                this.currentProject = this._environmentBridge.project;
            }
        }
    },

    didCreate: {
        value: function () {
            var self = this;
            if (IS_IN_LUMIERES) {
                require.async("core/lumieres-bridge").then(function (exported) {
                    self.environmentBridge = exported.LumiereBridge.create();
                });
            } else {
                require.async("core/browser-bridge").then(function (exported) {
                    self.environmentBridge = exported.BrowserBridge.create();
                });
            }
        }
    },

    workbench: {
        value: null
    },

    // TODO support multiple select
    selectedObject: {
        value: null
    },

    prepareForDraw: {
        value: function () {
            this.addEventListener("action", this, false);
        }
    },

    handlePrototypeButtonAction: {
        value: function (evt) {
            var prototypeEntry = evt.target.prototypeObject;
            this.workbench.addComponent(
                prototypeEntry.serialization.prototype,
                prototypeEntry.name,
                prototypeEntry.html,
                prototypeEntry.serialization.properties,
                prototypeEntry.postProcess
            );
        }
    }

});
