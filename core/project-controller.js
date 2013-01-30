var Montage = require("montage/core/core").Montage,
    Promise = require("montage/core/promise").Promise,
    LibraryItem = require("filament-plugin/core/library-item.js").LibraryItem,
    Deserializer = require("montage/core/deserializer").Deserializer,
    ArrayController = require("montage/ui/controller/array-controller").ArrayController;

exports.ProjectController = Montage.create(Montage, {

    init: {
        value: function (bridge, viewController) {
            this._environmentBridge = bridge;
            this._viewController = viewController;
            this.openDocumentsController = ArrayController.create().initWithContent([]);

            this.openDocumentsController.addPropertyChangeListener("selectedObjects", this);

            this.loadedPlugins = [];
            this.activePlugins = [];
            this.moduleLibraryItemMap = {};
            this.packageNameLibraryItemsMap = {};

            this.setupMenuItems();

            var self = this,
                application = document.application,
                deferredEditor = Promise.defer();

            application.addEventListener("activatePlugin", this);
            application.addEventListener("deactivatePlugin", this);

            application.addEventListener("canLoadReel", function () {
                deferredEditor.resolve(true);
            });
            //TODO timeout the promise in some reasonable window

            // discover available plugins as soon as possible,
            // subsequent activity may rely on us knowing them
            this._pluginPromise = this.environmentBridge.availablePlugins
                .then(function (pluginUrls) {
                    return self.loadPlugins(pluginUrls);
                }).then(function (plugins) {
                    plugins.forEach(function (plugin) {
                        // TODO self.activatePlugin(plugin); if the plugin is supposed to be activated based on user preferences
                    });
                });

            Promise.all([this._pluginPromise, deferredEditor]).then(function () {
                self.dispatchEventNamed("canLoadProject", true, false);
            }).done();

            this.addPropertyChangeListener("currentDocument.undoManager.undoLabel", this);
            this.addPropertyChangeListener("currentDocument.undoManager.redoLabel", this);

            return this;
        }
    },

    loadPlugins: {
        enumerable: false,
        //TODO accept a single plugin as well
        value: function (pluginUrls) {
            var self = this;

            return Promise.all(pluginUrls.map(function (url) {
                return require.loadPackage(url).then(function (packageRequire) {
                    return packageRequire.async("plugin").then(function (exports) {
                        return self.loadPlugin(exports);
                    });
                });
            }));
        }
    },

    loadPlugin: {
        enumerable: false,
        value: function (pluginModule) {
            var plugin = pluginModule.Plugin;

            if (!plugin) {
                throw new Error("Malformed plugin. Expected '" + pluginModule + "' to export 'Plugin'");
            }

            this.loadedPlugins.add(plugin);
            return plugin;
        }
    },

    loadedPlugins: {
        value: null
    },

    activePlugins: {
        value: null
    },

    handleActivatePlugin: {
        value: function (evt) {
            this.activatePlugin(evt.detail).done();
        }
    },

    activatePlugin: {
        value: function (plugin) {
            var activationPromise;

            if (-1 === this.activePlugins.indexOf(plugin)) {

                this.dispatchEventNamed("willActivatePlugin", true, false, plugin);
                this.activePlugins.push(plugin);

                if (typeof plugin.activate === "function") {
                    activationPromise = plugin.activate(document.application, this, this._viewController);
                } else {
                    activationPromise = Promise.resolve(plugin);
                }

            } else {
                activationPromise = Promise.reject(new Error("Cannot activate an active plugin"));
            }

            return activationPromise;
        }
    },

    handleDeactivatePlugin: {
        value: function (evt) {
            this.deactivatePlugin(evt.detail).done();
        }
    },

    deactivatePlugin: {
        value: function (plugin) {
            var deactivationPromise,
                index = this.activePlugins.indexOf(plugin);

            if (index > -1) {

                this.dispatchEventNamed("willDeactivatePlugin", true, false, plugin);
                this.activePlugins.splice(index, 1);

                if (typeof plugin.deactivate === "function") {
                    deactivationPromise = plugin.deactivate(document.application, this, this._viewController);
                } else {
                    deactivationPromise = Promise.resolve(plugin);
                }

            } else {
                deactivationPromise = Promise.reject(new Error("Cannot deactivate an inactive plugin"));
            }

            return deactivationPromise;
        }
    },

    _environmentBridge: {
        value: null
    },

    environmentBridge: {
        get: function () {
            return this._environmentBridge;
        }
    },

    _viewController: {
        value: null
    },

    _pluginPromise: {
        value: null
    },

    // The project url as provided by the environment
    // Typically, if a url is provided by the environment this would be the url
    // to try and load.
    projectUrl: {
        get: function () {
            return this.environmentBridge.projectUrl;
        }
    },

    // The url of the package of the open project
    packageUrl: {
        value: null
    },

    // The ID of the preview being served by our host environment
    previewId: {
        enumerable: false,
        value: null
    },

    // The collection of components available within the open package
    // This is actually a collection of descriptive ComponentInfo objects
    components: {
        value: null
    },

    files: {
        value: null
    },

    dependencies: {
        value: null
    },

    // The groups of library items available to this package
    libraryGroups: {
        value: null
    },

    loadProject: {
        value: function (url) {
            var self = this;

            this._pluginPromise.then(function () {
                return self.environmentBridge.projectInfo(url);
            }).then(function (projectInfo) {
                self.openProject(projectInfo);
            }).done();
        }
    },

    // TODO define projectInfo contract
    openProject: {
        enumerable: false,
        value: function (projectInfo) {
            var self = this;

            this._fileUrlEditorMap = {};

            this.dispatchEventNamed("willOpenPackage", true, false, {
                packageUrl: projectInfo.packageUrl
            });

            this.packageUrl = projectInfo.packageUrl;
            this.dependencies = projectInfo.dependencies;

            // Add in components from the package being edited itself
            this.dependencies.unshift({dependency: "", url: this.environmentBridge.convertBackendUrlToPath(this.packageUrl)});

            this.watchForFileChanges();

            Promise.all([this.populateFiles(), this.populateLibrary()])
                .then(function () {
                    self.dispatchEventNamed("didOpenPackage", true, false, {
                        packageUrl: self.packageUrl
                    });

                    //TODO only do this if we have an index.html
                    self.environmentBridge.registerPreview(self.packageUrl, self.packageUrl + "/index.html").then(function (previewId) {
                        self.previewId = previewId;
                        self.dispatchEventNamed("didRegisterPreview", true, false);
                        //TODO not launch this automatically
                        return self.launchPreview();
                    }).done();

                }).done();
        }
    },

    willCloseProject: {
        value: function () {
            //TODO only if we're registered
            this.unregisterPreview().done();
        }
    },

    launchPreview: {
        value: function () {
            var self = this;
            return this.environmentBridge.launchPreview(this.previewId).then(function () {
                //TODO pass along url for preview in event
                self.dispatchEventNamed("didLaunchPreview", true, false);
            });
        }
    },

    refreshPreview: {
        value: function () {
            var self = this;
            return this.environmentBridge.refreshPreview(this.previewId).then(function () {
                //TODO pass along url for preview in event
                self.dispatchEventNamed("didRefreshPreview", true, false);
            });
        }
    },

    unregisterPreview: {
        value: function () {
            var self = this;
            return this.environmentBridge.unregisterPreview(this.previewId).then(function () {
                //TODO pass along url for preview in event
                self.dispatchEventNamed("didUnregisterPreview", true, false);
            });
        }
    },

    _fileUrlEditorMap: {
        value: null
    },

    openFileUrlInEditor: {
        value: function (fileUrl, editor) {
            var editingDocuments,
                docIndex,
                self = this,
                promisedDocument;

            if (this.currentDocument && fileUrl === this.currentDocument.fileUrl) {
                promisedDocument = Promise.resolve(this.currentDocument);
            } else {

                this.dispatchEventNamed("willExitDocument", true, false, this.currentDocument);

                editingDocuments = this.openDocumentsController.organizedObjects;
                docIndex = editingDocuments.map(function (doc) {
                    return doc.fileUrl;
                }).indexOf(fileUrl);

                if (docIndex > -1) {

                    promisedDocument = editor.load(fileUrl, this.packageUrl).then(function (editingDocument) {
                        self.currentDocument = editingDocument;
                        self.openDocumentsController.selectedObjects = [editingDocument];
                        self.dispatchEventNamed("didEnterDocument", true, false, editingDocument);
                        return editingDocument;
                    });

                } else {

                    this._fileUrlEditorMap[fileUrl] = editor;

                    promisedDocument = editor.load(fileUrl, this.packageUrl).then(function (editingDocument) {
                        self.currentDocument = editingDocument;
                        self.openDocumentsController.addObjects(editingDocument);
                        self.openDocumentsController.selectedObjects = [editingDocument];

                        self.dispatchEventNamed("didLoadDocument", true, false, editingDocument);
                        self.dispatchEventNamed("didEnterDocument", true, false, editingDocument);

                        return editingDocument;
                    });
                }

            }

            return promisedDocument;
        }
    },

    handleChange: {
        value: function (notification) {

            var currentPropertyPath = notification.currentPropertyPath;

            if (notification.target === this.openDocumentsController && "selectedObjects" === currentPropertyPath) {
                if (this.openDocumentsController.selectedObjects && this.openDocumentsController.selectedObjects.length > 0) {
                    var fileUrl = this.openDocumentsController.selectedObjects[0].fileUrl,
                        editor = this._fileUrlEditorMap[fileUrl];
                    this.openFileUrlInEditor(fileUrl, editor).done();
                }
            } else if ("currentDocument.undoManager.undoLabel" === currentPropertyPath ||
                       "currentDocument.undoManager.redoLabel" === currentPropertyPath) {
                this.updateUndoMenus();
            }

        }
    },

    updateUndoMenus: {
        enumerable: false,
        value: function () {

            if (this.getProperty("currentDocument.undoManager.undoCount")) {
                this.environmentBridge.setUndoState(true, this.getProperty("currentDocument.undoManager.undoLabel"));
            } else {
                this.environmentBridge.setUndoState(false);
            }

            if (this.getProperty("currentDocument.undoManager.redoCount")) {
                this.environmentBridge.setRedoState(true, this.getProperty("currentDocument.undoManager.redoLabel"));
            } else {
                this.environmentBridge.setRedoState(false);
            }
        }
    },

    openDocumentsController: {
        value: null
    },

    _objectNameFromModuleId: {
        value: function (moduleId) {
            //TODO this utility should live somewhere else (/baz/foo-bar.reel to FooBar)
            Deserializer._findObjectNameRegExp.test(moduleId);
            return RegExp.$1.replace(Deserializer._toCamelCaseRegExp, Deserializer._replaceToCamelCase);
        }
    },

    //TODO cache this promise, clear cache when we detect a change?
    findLibraryItems: {
        enumerable: false,
        value: function (dependencies) {
            var self = this,
                moduleId,
                objectName,
                dependencyLibraryPromises,
                dependencyLibraryEntry,
                offeredLibraryItems;

            dependencyLibraryPromises = dependencies.map(function (dependency) {

                return self.environmentBridge.componentsInPackage(dependency.url)
                    .then(function (componentUrls) {

                        dependencyLibraryEntry = {
                            dependency: dependency.dependency
                        };

                        if (componentUrls) {
                            dependencyLibraryEntry.libraryItems = componentUrls.map(function (componentUrl) {
                                if (/\/node_modules\//.test(componentUrl)) {
                                    // It's a module inside a node_modules dependency
                                    //TODO be able to handle dependencies from mappings?
                                    moduleId = componentUrl.replace(/\S+\/node_modules\//, "");
                                } else {
                                    //It's a module that's part of the current package being edited
                                    moduleId = componentUrl.replace(dependency.url + "/", "");
                                }
                                objectName = self._objectNameFromModuleId(moduleId);
                                return self.libraryItemForModuleId(moduleId, objectName);
                            }).filter(function (libraryItem) {
                                return libraryItem;
                            });
                        } else {
                            dependencyLibraryEntry.libraryItems = [];
                        }

                        // add libraryItems any plugins offered for this package
                        offeredLibraryItems = self.packageNameLibraryItemsMap[dependency.dependency];
                        if (offeredLibraryItems) {
                            dependencyLibraryEntry.libraryItems.push.apply(dependencyLibraryEntry.libraryItems, offeredLibraryItems);
                        }

                        return dependencyLibraryEntry;
                    });
            });

            return Promise.all(dependencyLibraryPromises);
        }
    },

    moduleLibraryItemMap: {
        enumerable: false,
        value : null
    },

    //TODO handle multiple plugins possibly registering for the same moduleId, latest one wins?
    registerLibraryItemForModuleId: {
        value: function (libraryItem, moduleId) {
            this.moduleLibraryItemMap[moduleId] = libraryItem;

            //TODO don't refresh the library each time
            this.populateLibrary().done();
        }
    },

    //TODO allow for multiple plugins to unregister for same moduleId, don't disrupt current order
    unregisterLibraryItemForModuleId: {
        value: function (moduleId) {
            delete this.moduleLibraryItemMap[moduleId];

            //TODO don't refresh the library each time
            this.populateLibrary().done();
        }
    },

    libraryItemForModuleId: {
        enumerable: false,
        value: function (moduleId, objectName) {
            var libraryEntry = this.moduleLibraryItemMap[moduleId],
                item;

            if (libraryEntry) {
                item = libraryEntry.create();
            } else if (typeof libraryEntry === "undefined") {
                item = LibraryItem.create();
                item.serialization = {prototype: moduleId};
                item.name = objectName;
                item.html = '<div></div>';
            }

            return item;
        }
    },

    packageNameLibraryItemsMap: {
        enumerable: false,
        value: null
    },

    registerLibraryItemForPackageName: {
        value: function (libraryItem, packageName) {
            var addedLibraryItems = this.packageNameLibraryItemsMap[packageName];

            if (!addedLibraryItems) {
                addedLibraryItems = this.packageNameLibraryItemsMap[packageName] = [];
            }

            addedLibraryItems.push(libraryItem);

            //TODO don't refresh the library each time
            this.populateLibrary().done();
        }
    },

    unregisterLibraryItemForPackageName: {
        value: function (libraryItem, packageName) {
            var addedLibraryItems = this.packageNameLibraryItemsMap[packageName],
                index;

            if (addedLibraryItems) {
                index = addedLibraryItems.indexOf(libraryItem);
                if (index >= 0) {
                    addedLibraryItems.splice(index, 1);
                    //TODO don't refresh the library each time
                    this.populateLibrary().done();
                }
            }
        }
    },

    currentDocument: {
        value: null
    },

    undo: {
        value: function () {
            if (this.currentDocument) {
                this.currentDocument.undo();
            }
        }
    },

    redo: {
        value: function () {
            if (this.currentDocument) {
                this.currentDocument.redo();
            }
        }
    },

    documents: {
        value: null
    },

    save: {
        value: function () {

            if (!this.currentDocument) {
                return;
            }

            if (!this.environmentBridge) {
                throw new Error("Cannot save without an environment bridge");
            }

            this.dispatchEventNamed("willSave", true, false);

            //TODO use either the url specified (save as), or the currentDoc's fileUrl
            //TODO improve this, we're reaching deeper than I'd like to find the fileUrl
            var self = this;
            this.environmentBridge.save(this.currentDocument, this.currentDocument.fileUrl).then(function () {
                return self.refreshPreview();
            }).done();
        }
    },

    installDependencies: {
        value: function () {
            var self = this,
                config = {
                    prefix : this.environmentBridge.convertBackendUrlToPath(this.packageUrl)
                };

            this._isInstallingDependencies = true;
            this.environmentBridge.installDependencies(config).then(function () {
                //TODO update this.dependencies, they've possibly changed
                self._isInstallingDependencies = false;
                self.populateLibrary().done();
            }).done();
        }
    },

    createApplication: {
        value: function () {
            var options = {
                    displayAsSheet: true,
                    defaultName: "my-app", // TODO localize the default app-name
                    prompt: "Create" //TODO localize this
                },
                self = this;

            this.environmentBridge.promptForSave(options).then(function (destination) {
                var destinationDividerIndex = destination.lastIndexOf("/"),
                    appName = destination.substring(destinationDividerIndex + 1),
                    packageHome = destination.substring(0, destinationDividerIndex).replace("file://localhost", "");

                return self.environmentBridge.createApplication(appName, packageHome);
            }).then(function (applicationUrl) {
                self.loadProject(applicationUrl);
            }, function () {
                window.close();
            }).done();
        }
    },

    createComponent: {
        value: function () {

            if (!this.canCreateComponents) {
                throw new Error("Cannot create components without an open project");
            }

            var packagePath = this.environmentBridge.convertBackendUrlToPath(this.packageUrl),
                options = {
                    defaultDirectory: "file://localhost" + packagePath,
                    defaultName: "my-component", // TODO localize this
                    prompt: "Create" //TODO localize this
                },
                self = this;

            return this.environmentBridge.promptForSave(options)
            .then(function (destination) {
                if (!destination) {
                    return null;
                }

                var destinationDividerIndex = destination.lastIndexOf("/"),
                    componentName = destination.substring(destinationDividerIndex + 1),
                    //TODO complain if packageHome does not match this.packageUrl?
                    packageHome = destination.substring(0, destinationDividerIndex).replace("file://localhost", ""),
                    relativeDestination = destination.substring(0, destinationDividerIndex).replace(packageHome, "").replace(/^\//, "");

                return self.environmentBridge.createComponent(componentName, packageHome, relativeDestination);
            });
            //TODO handle a cancelled creation vs some error
        }
    },

    _windowIsKey: {
        value: true //TODO not assume our window is key
    },

    didBecomeKey: {
        value: function () {
            this._windowIsKey = true;
        }
    },

    didResignKey: {
        value: function () {
            this._windowIsKey = false;
        }
    },

    canCreateComponents: {
        dependencies: ["_windowIsKey", "packageUrl"],
        get: function () {
            return !!(this._windowIsKey && this.packageUrl);
        }
    },

    setupMenuItems: {
        enumerable: false,
        value: function () {

            var newComponentMenuItem,
                self = this;

            this.environmentBridge.mainMenu.then(function (mainMenu) {
                newComponentMenuItem = mainMenu.menuItemForIdentifier("newComponent");

                Object.defineBinding(newComponentMenuItem, "enabled", {
                    boundObject: self,
                    boundObjectPropertyPath: "canCreateComponents",
                    oneway: true
                });
            }).done();
        }
    },

    watchForFileChanges: {
        enumerable: false,
        value: function () {
            var self = this,
                changeHandler = function (changeType, filePath) {
                    self.handleFileSystemChange(changeType, filePath);
                };

            this.environmentBridge.watch(this.packageUrl, changeHandler).done();
        }
    },

    handleFileSystemChange: {
        value: function (change, filePath) {

            this.dispatchEventNamed("fileSystemChange", true, false, {
                change: change,
                filePath: filePath
            });

            //TODO this is heavy handed, but really more of a proof of concept than anything else
            if (!this._isInstallingDependencies) {
                this.populateLibrary().done();
            }
        }
    },

    populateFiles: {
        enumerable: false,
        value: function () {
            var self = this,
                packagePath = this.environmentBridge.convertBackendUrlToPath(this.packageUrl);

            return this.environmentBridge.listTreeAtUrl(packagePath).then(function (fileDescriptors) {
                self.files = fileDescriptors;
            });
        }
    },

    populateLibrary: {
        enumerable: false,
        value: function () {
            var self = this;
            return this.findLibraryItems(this.dependencies).then(function (dependencyLibraryEntries) {
                self.libraryGroups = dependencyLibraryEntries;
            });
        }
    }

});
