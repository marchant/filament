var Montage = require("montage/core/core").Montage,
    Component = require("montage/ui/component").Component,
    Promise = require("montage/core/promise").Promise,
    ProjectController = require("core/project-controller.js").ProjectController,
    ViewController = require("core/view-controller.js").ViewController,
    ComponentEditor = require("ui/component-editor.reel").ComponentEditor,
    List = require("montage/collections/list"),
    WeakMap = require("montage/collections/weak-map");

var IS_IN_LUMIERES = (typeof lumieres !== "undefined");

exports.Main = Montage.create(Component, {

    projectController: {
        value: null
    },

    viewController: {
        value: null
    },

    editorSlot: {
        value: null
    },

    _projectControllerPromise: {
        value: null
    },

    didCreate: {
        value: function () {
            var bridgePromise,
                self = this;

            if (IS_IN_LUMIERES) {
                bridgePromise = require.async("core/lumieres-bridge").then(function (exported) {
                    return Promise.resolve(exported.LumiereBridge.create());
                });
            } else {
                bridgePromise = require.async("core/browser-bridge").then(function (exported) {
                    return Promise.resolve(exported.BrowserBridge.create());
                });
            }

            this._projectControllerPromise = bridgePromise.then(function (environmentBridge) {
                self.viewController = ViewController.create();
                return ProjectController.load(environmentBridge, self.viewController);
            });

            return this._projectControllerPromise;
        }
    },

    prepareForDraw: {
        value: function () {

            var self = this;

            this.editorTypeInstancePromiseMap = new WeakMap();
            this._editorsToInsert = [];
            this._fileUrlEditorMap = {};
            this.openEditors = [];

            this.application.addEventListener("asyncActivity", this, false);

            this._projectControllerPromise.then(function (projectController) {
                self.projectController = projectController;

                var projectUrl = self.projectController.projectUrl,
                    app = self.application;

                if (projectUrl) {
                    self.projectController.loadProject(projectUrl).done();
                } else {
                    self.projectController.createApplication();
                }

                self.projectController.addEventListener("didOpenPackage", self, false);

                window.addEventListener("didBecomeKey", function () {
                    self.projectController.didBecomeKey();
                });

                window.addEventListener("didResignKey", function () {
                    self.projectController.didResignKey();
                });

                window.addEventListener("openRelatedFile", function (evt) {
                    var url = evt.detail;
                    self.openFileUrl(url.replace("file://localhost/", "fs://localhost/").replace(/\/$/, ""));
                });

                window.addEventListener("beforeunload", function () {
                    self.projectController.willCloseProject();
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

                app.addEventListener("menuAction", self, false);
                app.addEventListener("activateExtension", this);
                app.addEventListener("deactivateExtension", this);

                self.viewController.registerEditorTypeForFileTypeMatcher(ComponentEditor, function (fileUrl) {
                    return (/\.reel\/?$/).test(fileUrl);
                });
            }).done();
        }
    },

    handleDidOpenPackage: {
        enumerable: false,
        value: function () {
            this.addOwnPropertyChangeListener("windowTitle", this, false);

            document.addEventListener("save", this, false);

            var app = document.application;
            app.addEventListener("enterModalEditor", this);
            app.addEventListener("openFile", this);
            app.addEventListener("addFile", this);
            app.addEventListener("closeDocument", this);

            var files = this.projectController.files;
            var projectUrl = this.projectController.projectUrl;
            for (var i = 0, len = files.length; i < len; i++) {
                var fileUrl = files[i].fileUrl;
                if (fileUrl.replace(projectUrl, "") === "/ui/main.reel") {
                    this.openFileUrl(fileUrl).done();
                    break;
                }
            }

            // Update title
            // TODO this should be unnecessary as the packageUrl has been changed...
            this.needsDraw = true;
        }
    },

    handleActivateExtension: {
        value: function (evt) {
            this.projectController.activateExtension(evt.detail).done();
        }
    },

    handleDeactivateExtension: {
        value: function (evt) {
            this.projectController.deactivateExtension(evt.detail).done();
        }
    },

    handleAddComponent: {
        value: function (evt) {
            var editor,
                currentFileUrl = this.projectController.getPath("currentDocument.fileUrl");

            if (currentFileUrl && (editor = this.componentEditorMap[currentFileUrl])) {
                editor.addComponent(evt.detail.prototypeObject);
            }
        }
    },

    handleOpenFile: {
        value: function (evt) {
            //TODO as user action made this happen, make sure we end up showing the latest handleOpenFile above all others, regardless of the order the promises resolve in
            this.openFileUrl(evt.detail.fileUrl).done();
        }
    },

    handleCloseDocument: {
        value: function (evt) {
            this.closeFileUrl(evt.detail.fileUrl).done();
        }
    },

    editorTypeInstancePromiseMap: {
        enumerable: false,
        value: null
    },

    _fileUrlEditorMap: {
        enumerable: false,
        value: null
    },

    openEditors: {
        enumerable: false,
        value: null
    },

    openFileUrl: {
        enumerable: false,
        value: function (fileUrl) {
            var openFilePromise,
                editorType = this.viewController.editorTypeForFileUrl(fileUrl),
                editorPromise,
                deferredEditor,
                newEditor,
                editorFirstDrawHandler,
                self = this;

            if (editorType) {
                editorPromise = this.editorTypeInstancePromiseMap.get(editorType);

                if (!editorPromise) {

                    deferredEditor = Promise.defer();
                    editorPromise = deferredEditor.promise;
                    this.editorTypeInstancePromiseMap.set(editorType, editorPromise);

                    newEditor = editorType.create();
                    this._editorsToInsert.push(newEditor);

                    editorFirstDrawHandler = function (evt) {
                        var editor = evt.target;
                        editor.projectController = self.projectController;
                        editor.viewController = self.viewController;

                        editor.removeEventListener("firstDraw", editorFirstDrawHandler, false);
                        deferredEditor.resolve(editor);
                    };

                    newEditor.addEventListener("firstDraw", editorFirstDrawHandler, false);
                    this.needsDraw = true;
                }

                openFilePromise = editorPromise.then(function (editorInstance) {
                    return self.openFileUrlInEditor(fileUrl, editorInstance);
                });

            } else {
                console.log("No editor type for this file", fileUrl);
                openFilePromise = Promise.resolve(null);
            }

            return openFilePromise;
        }
    },

    openFileUrlInEditor: {
        enumerable: false,
        value: function (fileUrl, editor) {
            if (-1 === this.openEditors.indexOf(editor)) {
                this.openEditors.push(editor);
            }
            this._fileUrlEditorMap[fileUrl] = editor;

            return this.projectController.openFileUrlInEditor(fileUrl, editor);
        }
    },

    closeFileUrl: {
        value: function (fileUrl) {
            var editor = this._fileUrlEditorMap[fileUrl],
                promisedClose,
                self = this;

            if (editor) {
                promisedClose = this.projectController.closeFileUrlInEditor(fileUrl, editor).then(function (document) {
                   delete self._fileUrlEditorMap[fileUrl];
                });
            } else {
                promisedClose = Promise.reject(new Error("Cannot close file that is not open"));
            }

            return promisedClose;
        }
    },

    handleAsyncActivity: {
        value: function(event) {
            this.templateObjects.tasksInfobar.addActivity(
                event.detail.promise,
                event.detail.title,
                event.detail.status
            );
        }
    },

    handleAddFile: {
        enumerable: false,
        value: function () {
            //TODO don't call addComponent until we know it's a component we want
            this.projectController.createComponent().done();
        }
    },

    handleSave: {
        enumerable: false,
        value: function (evt) {
            evt.preventDefault();
            this.projectController.save(evt.detail.url).then(function () {
                evt.detail.operationCallback();
            }).done();
        }
    },

    handleChange: {
        enumerable: false,
        value: function (notification) {
            if ("windowTitle" === notification.currentPropertyPath) {
                this.needsDraw = true;
            }
        }
    },

    handleMenuAction: {
        enumerable: false,
        value: function (evt) {
            switch (evt.detail.identifier) {
                case "newComponent":
                    this.projectController.createComponent().done();
                    break;
                case "newModule":
                    this.projectController.createModule().done();
                    break;
            }
        }
    },

    windowTitle: {
        dependencies: ["packageUrl", "projectController.currentDocument.title"],
        get: function () {

            var projectTitle,
                packageUrl = this.projectController ? this.projectController.packageUrl : null,
                currentDocument = this.projectController ? this.projectController.currentDocument : null;

            if (packageUrl) {
                projectTitle = packageUrl.substring(packageUrl.lastIndexOf("/") + 1);
            }

            if (currentDocument) {
                projectTitle = currentDocument.title + " — " + projectTitle;
            }

            return projectTitle;
        }
    },

    _palettesVisible: {
        value: true
    },

    palettesVisible: {
        get: function () {
            return this._palettesVisible;
        },
        set: function (value) {
            if (value === this._palettesVisible) {
                return;
            }

            this._palettesVisible = value;
            this.needsDraw = true;
        }
    },

    handleTogglePaletteKeyPress: {
        enumerable: false,
        value: function () {
            this.palettesVisible = !this.palettesVisible;
        }
    },

    handleExitModalEditorKeyPress: {
        enumerable: false,
        value: function () {
            this.modalEditorComponent = null;
            this.palettesVisible = true;
            this._isUsingModalEditor = false;
        }
    },

    _isUsingModalEditor: {
        value: false
    },

    isUsingModalEditor: {
        get: function () {
            return this._isUsingModalEditor;
        }
    },

    /**
     The component to show in the slot that will edit the selected component
     */
    modalEditorComponent: {
        value: null
    },

    handleEnterModalEditor: {
        enumerable: false,
        value: function (event) {
            this.modalEditorComponent = event.detail.modalEditor;
            this.palettesVisible = false;
            this._isUsingModalEditor = true;
        }
    },

    draw: {
        value: function () {
            if (this.windowTitle) {
                document.title = this.windowTitle;
            }

            if (this.palettesVisible) {
                this.element.classList.remove("palettes-hidden");
            } else {
                this.element.classList.add("palettes-hidden");
            }

            var editorArea,
                element,
                editorElement,
                currentEditor,
                currentFileUrl;

            if (this._editorsToInsert.length) {
                editorArea = this.editorSlot;

                //TODO do this in a fragment if possible
                this._editorsToInsert.forEach(function (editor) {
                    element = document.createElement("div");
                    editor.element = element;
                    editorArea.appendChild(element);
                    editor.attachToParentComponent();
                    editor.needsDraw = true;
                });
                this._editorsToInsert = [];
            }

            //TODO optimize this entire draw method
            currentFileUrl = this.getPath("projectController.currentDocument.fileUrl");
            currentEditor = this._fileUrlEditorMap[currentFileUrl];

            this.openEditors.forEach(function (editor) {
                editorElement = editor.element;
                if (editorElement && editor === currentEditor) {
                    editorElement.classList.remove("standby");
                } else if (editor.element) {
                    editorElement.classList.add("standby");
                }
            });
        }
    }
});
