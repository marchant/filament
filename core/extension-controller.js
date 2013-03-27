var Montage = require("montage/core/core").Montage,
    Promise = require("montage/core/promise").Promise;

exports.ExtensionController = Montage.create(Montage, {

    _applicationDelegate: {
        value: null
    },

    applicationDelegate: {
        get: function () {
            return this._applicationDelegate;
        }
    },

    /**
     * The collection of all extensions loaded by the projectController.
     * Note that these are not necessarily active, simply loaded.
     */
    loadedExtensions: {
        value: null
    },

    /**
     * The collection of all active extensions
     */
    activeExtensions: {
        value: null
    },

    didCreate: {
        value: function () {
            this.loadedExtensions = [];
            this.activeExtensions = [];
        }
    },

    init: {
        value: function (applicationDelegate) {
            this._applicationDelegate = applicationDelegate;
            return this;
        }
    },

    loadExtensions: {
        value: function () {
            var self = this,
                bridge = this.applicationDelegate.environmentBridge,
                app = this.applicationDelegate.application;

            return bridge.availableExtensions.then(function (extensionUrls) {
                return Promise.all(extensionUrls.map(function (entry) {
                    return self.loadExtension(entry.url);
                }));
            }).then(function (extensions) {
                self.loadedExtensions = extensions;

                //TODO just listen on applicationController once it's in the event target chain
                app.addEventListener("activateExtension", self);
                app.addEventListener("deactivateExtension", self);

                return extensions;
            });
        }
    },

    handleActivateExtension: {
        value: function (evt) {
            this.activateExtension(evt.detail).done();
        }
    },

    handleDeactivateExtension: {
        value: function (evt) {
            this.deactivateExtension(evt.detail).done();
        }
    },

    /**
     * Asynchronously load the extension package from the specified
     * extensionUrl, returning a reference to the exported Extension.
     *
     * When called as a method on an instance of a ProjectController
     * the loadedExtension will be added to the instance's
     * loadedExtensions collection automatically.
     *
     * @param {string} extensionUrl The extension package Url to load
     * @return {Promise} A promise for the exported Extension object
     */
    loadExtension: {
        enumerable: false,
        value: function (extensionUrl) {

            var self = this;

            // TODO npm install?
            return require.loadPackage(extensionUrl).then(function (packageRequire) {
                return packageRequire.async("extension");
            }).then(function (exports) {
                    var extension = exports.Extension;

                    if (!extension) {
                        throw new Error("Malformed extension. Expected '" + extensionUrl + "' to export 'Extension'");
                    }

                    if (self.loadedExtensions) {
                        self.loadedExtensions.push(extension);
                    }

                    return extension;
                }, function(error) {
                    console.log("Could not load extension at: " + extensionUrl);
                    Promise.reject(new Error("Could not load extension at: " + extensionUrl, error));
                });
        }
    },

    /**
     * Asynchronously activate the specified extension
     *
     * @param {Extension} extension The extension to activate
     * @return {Promise} A promise for the activated extension
     */
    activateExtension: {
        value: function (extension) {
            var activationPromise;

            if (-1 === this.activeExtensions.indexOf(extension)) {

                this.dispatchEventNamed("willActivateExtension", true, false, extension);
                this.activeExtensions.push(extension);

                if (typeof extension.activate === "function") {
                    //TODO only pass along the applicationDelegate?
                    activationPromise = extension.activate(this.applicationDelegate.application, this.applicationDelegate.projectController, this.applicationDelegate.viewController);
                } else {
                    activationPromise = Promise.resolve(extension);
                }

            } else {
                activationPromise = Promise.reject(new Error("Cannot activate an active extension"));
            }

            return activationPromise;
        }
    },

    /**
     * Asynchronously deactivate the specified extension
     *
     * @param {Extension} extension The extension to deactivate
     * @return {Promise} A promise for the deactivated extension
     */
    deactivateExtension: {
        value: function (extension) {
            var deactivationPromise,
                index = this.activeExtensions.indexOf(extension);

            if (index > -1) {

                this.dispatchEventNamed("willDeactivateExtension", true, false, extension);
                this.activeExtensions.splice(index, 1);

                if (typeof extension.deactivate === "function") {
                    //TODO only pass along the applicationDelegate
                    deactivationPromise = extension.deactivate(this.applicationDelegate.application, this.applicationDelegate.projectController, this.applicationDelegate.viewController);
                } else {
                    deactivationPromise = Promise.resolve(extension);
                }

            } else {
                deactivationPromise = Promise.reject(new Error("Cannot deactivate an inactive extension"));
            }

            return deactivationPromise;
        }
    }

});