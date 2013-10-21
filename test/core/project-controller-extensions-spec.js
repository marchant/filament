var environmentBridgeMock = require("test/mocks/environment-bridge-mocks").environmentBridgeMock,
    editorControllerMock = require("test/mocks/editor-controller-mocks").editorControllerMock,
    extensionControllerMock = require("test/mocks/extension-controller-mocks").extensionControllerMock,
    ViewController = require("core/view-controller").ViewController,
    ProjectController = require("core/project-controller").ProjectController,
    Promise = require("montage/core/promise").Promise;

describe("core/project-controller-extensions-spec", function () {

    var bridge, viewController, editorController, projectController, extensionController;

    beforeEach(function () {
        bridge = environmentBridgeMock({
            componentsInPackage: function () {
                return Promise(["projectUrl/ui/pass.reel"]);
            },
            getExtensionsAt: function () {
                return Promise([{url: "fs:///projectUrl/projectUrl.filament-extension"}]);
            }
        });

        editorController = editorControllerMock();

        extensionController = extensionControllerMock();

        viewController = ViewController.create();
        projectController = ProjectController.create().init(bridge, viewController, editorController, extensionController);

        require.injectPackageDescription(require.location + "projectUrl/" , {
            name: "test"
        });
    });

    it("loads extensions in the package", function () {
        spyOn(extensionController, "loadExtension").andCallThrough();

        return projectController.loadProject("projectUrl").then(function () {
            expect(extensionController.loadExtension).toHaveBeenCalled();
            expect(extensionController.loadExtension.mostRecentCall.args[0]).toBe("fs:///projectUrl/projectUrl.filament-extension");
        });
    });

});
