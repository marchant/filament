var Montage = require("montage").Montage,
    environmentBridgeMock = require("mocks/environment-bridge-mocks").environmentBridgeMock,
    menuMock = require("mocks/menu-mocks").menuMock,
    editorControllerMock = require("mocks/editor-controller-mocks").editorControllerMock,
    applicationDelegateMock = require("mocks/application-delegate-mocks").applicationDelegateMock,
    ViewController = require("filament/core/view-controller").ViewController,
    ProjectController = require("filament/core/project-controller").ProjectController,
    Promise = require("montage/core/promise").Promise;

describe("core/project-controller-spec", function () {

    var bridge, viewController, editorController, projectController, mockMenu,
        applicationDelegate;

    beforeEach(function () {
        mockMenu = menuMock({
            menuItems: {
                "newComponent": Montage.specialize({}),
                "newModule": Montage.specialize({})
            }
        });

        bridge = environmentBridgeMock({
            list: function() {
                return Promise.resolve([]);
            },
            mainMenu: mockMenu
        });

        editorController = editorControllerMock();

        applicationDelegate = applicationDelegateMock();

        viewController = new ViewController();
        projectController = new ProjectController().init(bridge, viewController, editorController, null, null, applicationDelegate);
        projectController._packageRequirePromise = Promise.resolve();
    });

    describe("canEdit status", function () {

        it("must not be considered editable when it has no project loaded", function () {
            expect(projectController.canEdit).toBeFalsy();
        });

        it("should be considered editable when it has a loaded project", function () {
            return projectController.loadProject("url").then(function () {
                expect(projectController.canEdit).toBeTruthy();
            });
        });

    });

    describe("path cleanup", function() {
        it("should remove useless // in path", function() {
            var dirtyPath = "http://foo/bar//baz";

            var cleanPath = projectController._cleanupDestination(dirtyPath);

            expect(cleanPath).toEqual("http://foo/bar/baz");
        });
    });

});
