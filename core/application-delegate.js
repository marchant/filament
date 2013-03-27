/* global lumieres */
var Montage = require("montage/core/core").Montage,
    Promise = require("montage/core/promise").Promise,
    ExtensionController = require("core/extension-controller.js").ExtensionController,
    ViewController = require("core/view-controller.js").ViewController,
    PreviewController = require("core/preview-controller.js").PreviewController,
    ProjectController = require("core/project-controller.js").ProjectController,
    ReelDocument = require("core/reel-document").ReelDocument,
    IS_IN_LUMIERES = (typeof lumieres !== "undefined");

exports.ApplicationDelegate = Montage.create(Montage, {

    detectEnvironmentBridge: {
        value: function () {
            var bridgePromise;

            if (IS_IN_LUMIERES) {
                bridgePromise = require.async("core/lumieres-bridge").then(function (exported) {
                    return exported.LumiereBridge.create();
                });
            } else {
                bridgePromise = require.async("core/browser-bridge").then(function (exported) {
                    return exported.BrowserBridge.create();
                });
            }

            return bridgePromise;
        }
    },

    application: {
        value: null
    },

    viewController: {
        value: null
    },

    projectController: {
        value: null
    },

    extensionController: {
        value: null
    },

    previewController: {
        value: null
    },

    environmentBridge: {
        value: null
    },

    _deferredApplication: {
        value: null
    },

    _deferredMainComponent: {
        value: null
    },

    didCreate: {
        value: function () {
            // Make stack traces from promise errors easily available in the
            // console. Otherwise you need to manually inspect the error.stack
            // in the debugger.
            Promise.onerror = function (error) {
                if (error.stack) {
                    console.groupCollapsed("%c Uncaught promise rejection: " + (error.message || error), "color: #F00; font-weight: normal");
                    console.log(error.stack);
                    console.groupEnd();
                } else {
                    throw error;
                }
            };

            this._deferredApplication = Promise.defer();
            this._deferredMainComponent = Promise.defer();

            this.viewController = ViewController.create();

            this.previewController = PreviewController.create().init(this);

            var self = this,
                promisedApplication = this._deferredApplication.promise,
                promisedMainComponent = this._deferredMainComponent.promise,
                promisedLoadedExtensions,
                extensionController;

            promisedLoadedExtensions = Promise.all([promisedApplication, this.detectEnvironmentBridge()])
                .spread(function (app, bridge) {
                    self.application = app;
                    self.environmentBridge = bridge;

                    extensionController = self.extensionController = ExtensionController.create().init(self);
                    return extensionController.loadExtensions();

                });

            Promise.all([promisedMainComponent, promisedLoadedExtensions])
                .spread(function (mainComponent, loadedExtensions) {
                    self.projectController = ProjectController.create().init(self.environmentBridge, self.viewController, mainComponent);

                    self.projectController.registerUrlMatcherForDocumentType(function (fileUrl) {
                        return (/\.reel\/?$/).test(fileUrl);
                    }, ReelDocument);

                    //TODO not activate all extensions by default
                    return Promise.all(extensionController.loadedExtensions.map(function (extension) {
                        return extensionController.activateExtension(extension);
                    }));
                }).then(function (activatedExtensions) {
                    var projectUrl = self.environmentBridge.projectUrl,
                        promisedProjectUrl;

                    // With extensions now loaded and activated, load a project
                    if (projectUrl) {
                        promisedProjectUrl = self.projectController.loadProject(projectUrl);
                    } else {
                        promisedProjectUrl = self.projectController.createApplication();
                    }

                    return promisedProjectUrl;
                }).then(function (projectUrl) {
                    self.projectController.setupMenuItems();

                    //TODO only do this if we have an index.html
                    return self.previewController.registerPreview(projectUrl, projectUrl + "/index.html").then(function () {
                        //TODO not launch the preview automatically?
                        return self.previewController.launchPreview();
                    });
                }).done();
        }
    },

    handleComponentLoaded: {
        value: function (evt) {
            this._deferredMainComponent.resolve(evt.detail);
        }
    },

    willFinishLoading: {
        value: function (app) {
            var self = this;

            //TODO sort out where many of these belong, more of the actual handling should probably be here

            window.addEventListener("didBecomeKey", function () {
                self.projectController.didBecomeKey();
            });

            window.addEventListener("didResignKey", function () {
                self.projectController.didResignKey();
            });

            window.addEventListener("openRelatedFile", function (evt) {
                var url = evt.detail;
                self.openFileUrl(url.replace("file://localhost/", "fs://localhost/").replace(/\/$/, "")).done();
            });

            window.addEventListener("beforeunload", function () {
                self.willClose();
            }, true);

            window.addEventListener("undo", function (evt) {
                //TODO stop the event here?
                evt.stopPropagation();
                evt.preventDefault();
                self.projectController.undo();
            }, true);

            window.addEventListener("redo", function (evt) {
                //TODO stop the event here?
                evt.stopPropagation();
                evt.preventDefault();
                self.projectController.redo();
            }, true);

            app.addEventListener("didSave", this);

            this._deferredApplication.resolve(app);
        }
    },

    willClose: {
        value: function () {
            //TODO only if we're registered
            this.previewController.unregisterPreview().done();
        }
    },

    handleDidSave: {
        value: function () {
            this.previewController.refreshPreview().done();
        }
    }
});