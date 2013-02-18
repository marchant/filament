var Montage = require("montage").Montage,
    Promise = require("montage/core/promise").Promise,
    Binder = require("montage/core/meta/binder").Binder,
    Blueprint = require("montage/core/meta/blueprint").Blueprint,
    EditingDocument = require("palette/core/editing-document").EditingDocument,
    BlueprintProxy = require("./blueprint-proxy").BlueprintProxy;
var Serializer = require("montage/core/serializer").Serializer;
var parseForModuleAndName = require("montage/core/deserializer").Deserializer.parseForModuleAndName;

var BlueprintDocument = exports.BlueprintDocument = Montage.create(EditingDocument, {

    load:{
        value:function (fileUrl, packageUrl) {
            var deferredDoc = Promise.defer();
            var blueprintModuleId = fileUrl;
            if (fileUrl.indexOf(packageUrl) > -1) {
                blueprintModuleId = fileUrl.substring(packageUrl.length + 1);
            }

            require.loadPackage(packageUrl).then(function (packageRequire) {
                // This is cheesy and we probably need some better key to what we are editing
                if (blueprintModuleId.indexOf("blueprint") > -1) {
                    Blueprint.getBlueprintWithModuleId(blueprintModuleId, packageRequire).then(function (blueprint) {
                        deferredDoc.resolve(BlueprintDocument.create().init(fileUrl, packageRequire, blueprint, true));
                    }, function () {
                        // The blueprint file does not exist yet lets use the default blueprint.
                        var desc = parseForModuleAndName(blueprintModuleId.substring(0, blueprintModuleId.lastIndexOf("/")));
                        packageRequire.async(desc.module).get(desc.name).get("blueprint").then(function (blueprint) {
                            deferredDoc.resolve(BlueprintDocument.create().init(fileUrl, packageRequire, blueprint, true));
                        }, function () {
                            deferredDoc.reject(new Error("Could not open file at " + fileUrl));
                        });
                    });
                } else {
                    Binder.getBinderWithModuleId(blueprintModuleId, packageRequire).then(function (binder) {
                        deferredDoc.resolve(BlueprintDocument.create().init(fileUrl, packageRequire, binder, false));
                    }, function () {
                        deferredDoc.reject(new Error("Could not open file at " + fileUrl));
                    });
                }
            });
            return deferredDoc.promise;
        }
    },

    init:{
        value:function (fileUrl, packageRequire, currentObject, isBlueprint) {
            var self = EditingDocument.init.call(this, fileUrl, packageRequire);
            this.dispatchPropertyChange("currentProxyObject", function () {
                self._currentProxyObject = BlueprintProxy.create().init("blueprint", self, currentObject);
            });
            this.dispatchPropertyChange("isBlueprint", function () {
                self._isBlueprint = isBlueprint;
            });
            self._packageRequire = packageRequire;
            return self;
        }
    },

    save:{
        value:function (location, dataWriter) {
            // we need to be sur to use the right require.
            var serializer = Serializer.create().initWithRequire(this.packageRequire);
            var serializedDescription = serializer.serializeObject(this.currentProxyObject.proxiedObject);
            return dataWriter(serializedDescription, location);
        }
    },

    _isBlueprint:{
        value:false
    },

    isBlueprint:{
        get:function () {
            return this._isBlueprint;
        }
    },

    _currentProxyObject:{
        value:null
    },

    currentProxyObject:{
        get:function () {
            return this._currentProxyObject;
        }
    },

    _packageRequire:{
        value:null
    },

    packageRequire:{
        get:function () {
            return this._packageRequire;
        }
    },

    title:{
        dependencies:["fileUrl"],
        get:function () {
            return this.fileUrl.substring(this.fileUrl.lastIndexOf("/") + 1, this.fileUrl.lastIndexOf("."));
        }
    }

});
