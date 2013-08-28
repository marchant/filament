/*global describe,beforeEach,it,expect,waits,waitsFor,runs,afterEach */

var PATH = require("path");

var SandboxedModule = require('sandboxed-module');
var QFSMock = require("q-io/fs-mock");

describe("filament backend", function () {

    describe("getExtensions", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "root": {
                    "extensions": {
                        "a.filament-extension": 1,
                        "b.filament-extension": 1
                    }
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
                globals: {clientPath: "/root"}
            });
        });

        it("lists files with .filament-extension in extensions directory", function () {
            return filamentBackend.getExtensions().then(function (extensions) {
                expect(extensions.length).toBe(2);
                expect(extensions[0].url).toBe("fs://localhost/root/extensions/a.filament-extension");
                expect(extensions[1].url).toBe("fs://localhost/root/extensions/b.filament-extension");
            });
        });
    });

    describe("createApplication", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "root": {
                    "extensions": {
                        "a.filament-extension": 1,
                        "b.filament-extension": 1
                    }
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
                globals: {clientPath: "/root"}
            });
        });

        it("creates an app with a space in its name", function (done) {
            var timestamp = Date.now();
            filamentBackend.createApplication("my app" + timestamp, "/tmp/")
            .then(function (minitResults) {
                expect(minitResults.name).toEqual("my-app" + timestamp);
            })
            .then(done, done);
        }, 5000);

        // Disabled due to timeout issue
        xit("creates an app with a non-ascii characters in its name", function (done) {
            var timestamp = Date.now();
            return filamentBackend.createApplication("râțéăü" + timestamp, "/tmp/")
            .then(function (minitResults) {
                expect(minitResults.name).toEqual("rateau" + timestamp);
            })
            .then(done, done);
        }, 5000);
    });

    describe("createComponent", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "root": {
                    "extensions": {
                        "a.filament-extension": 1,
                        "b.filament-extension": 1
                    }
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
                globals: {clientPath: "/root"}
            });
        });

        it("resolves as the path to the created component", function () {
            var timestamp = Date.now();
            return filamentBackend.createComponent("foo" + timestamp, "/tmp", "bar")
                .then(function (path) {
                    expect(path).toEqual("/tmp/bar/foo" + timestamp + ".reel");
                });
        });

        it("creates an component with a space in its name", function () {
            var timestamp = Date.now();
            return filamentBackend.createComponent("my component" + timestamp, "/tmp/", "")
            .then(function (path) {
                var pieces = path.split("/");
                expect(pieces[pieces.length -1]).toEqual("my-component" + timestamp + ".reel");
            });
        });

        it("creates an component with a non-ascii characters in its name", function () {
            var timestamp = Date.now();
            return filamentBackend.createComponent("føø" + timestamp, "/tmp/", "")
            .then(function (path) {
                var pieces = path.split("/");
                expect(pieces[pieces.length -1]).toEqual("foo" + timestamp + ".reel");
            });
        });
    });

    describe("createModule", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "root": {
                    "extensions": {
                        "a.filament-extension": 1,
                        "b.filament-extension": 1
                    }
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
                globals: {clientPath: "/root"}
            });
        });

        it("creates an module with a space in its name", function () {
            var timestamp = Date.now();
            return filamentBackend.createModule("my module" + timestamp, "/tmp/", "")
            .then(function (path) {
                var pieces = path.split("/");
                expect(pieces[pieces.length -1]).toEqual("my-module" + timestamp);
            });
        });

        it("creates an module with a non-ascii characters in its name", function () {
            var timestamp = Date.now();
            return filamentBackend.createModule("bär" + timestamp, "/tmp/", "")
            .then(function (path) {
                var pieces = path.split("/");
                expect(pieces[pieces.length -1]).toEqual("bar" + timestamp);
            });
        });
    });



    describe("listTree", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "simple": {
                    "a": {
                        "b.js": 1,
                        "c": {
                            "d.js": 1
                        }
                    }
                },

                "ignore": {
                    ".git": {
                        "xxx": 1
                    },
                    ".gitignore": 1,
                    ".DS_Store": 1,
                    ".idea": 1,
                    "node_modules": {
                        "x": {
                            "node_modules": {
                                "y": {
                                    "y.js": 1
                                }
                            },
                            "index.js": 1
                        }
                    },
                    "ok.js": 1
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
            });
        });

        it("lists a tree", function () {
            return filamentBackend.listTree("/simple/a")
            .then(function (fileDescriptors) {
                expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                    "fs://localhost/simple/a/", "fs://localhost/simple/a/b.js", "fs://localhost/simple/a/c/", "fs://localhost/simple/a/c/d.js"
                ]);

            });
        });

        it("ignores some names, and doesn't traverse into the directories", function () {
            return filamentBackend.listTree("/ignore")
            .then(function (fileDescriptors) {
                expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                    "fs://localhost/ignore/", "fs://localhost/ignore/ok.js"
                ]);
            });
        });

        xit("will list a path containing node_modules", function () {
            return filamentBackend.listTree("/ignore/node_modules/x")
            .then(function (fileDescriptors) {
                return filamentBackend.listPackage("/root/a").then(function (fileDescriptors) {
                    expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                        "fs://localhost/ignore/node_modules/x/", "fs://localhost/ignore/node_modules/x/index.js"
                    ]);
                });
            });
        });
    });

    describe("listPackage", function () {

        it("skips node_modules", function() {
            var mockFS, filamentBackend;
            mockFS = QFSMock({
                "root": {
                    "a": {
                        "node_modules": {
                            "x": {
                                "node_modules": {
                                    "y": {
                                        "y.js": 1
                                    }
                                },
                                "index.js": 1
                            }
                        },
                        "ok.js": 1
                    }
                }
            });
            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
            });

            return filamentBackend.listPackage("/root/a").then(function (fileDescriptors) {
                expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                    "fs://localhost/root/a/", "fs://localhost/root/a/ok.js"
                ]);
            });
        });

        it("skips dotfiles", function() {
            var mockFS, filamentBackend;
            mockFS = QFSMock({
                "root": {
                    "a": {
                        ".git": {
                            "xxx": 1
                        },
                        ".gitignore": 1,
                        "ok.js": 1
                    }
                }
            });
            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
            });

            return filamentBackend.listPackage("/root/a").then(function (fileDescriptors) {
                expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                    "fs://localhost/root/a/", "fs://localhost/root/a/ok.js"
                ]);
            });
        });

        it("ignores excluded files", function() {
            var mockFS, filamentBackend;
            mockFS = QFSMock({
                "root": {
                    "a": {
                        "test": {
                            "xxx": 1,
                            "yyy": {
                                "zzz": 1
                            }
                        },
                        "package.json": JSON.stringify({
                            exclude: [ "test", "*-thing" ]
                        }),
                        "ok.js": 1,
                        "a-thing": 1,
                        "b-thing": 1
                    }
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS},
            });

            return filamentBackend.listPackage("/root/a").then(function (fileDescriptors) {
                expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                    "fs://localhost/root/a/", "fs://localhost/root/a/ok.js", "fs://localhost/root/a/package.json"
                ]);
            });
        });

    });

    describe("list", function () {
        var mockFS, filamentBackend;

        beforeEach(function () {
            mockFS = QFSMock({
                "simple": {
                    "a": {
                        "b.js": 1,
                        "c": {
                            "d.js": 1
                        }
                    }
                },

                "ignore": {
                    ".git": {
                        "xxx": 1
                    },
                    ".gitignore": 1,
                    ".DS_Store": 1,
                    ".idea": 1,
                    "node_modules": {
                        "x": {
                            "node_modules": {
                                "y": {
                                    "y.js": 1
                                }
                            },
                            "index.js": 1
                        }
                    },
                    "ok.js": 1
                }
            });

            filamentBackend = SandboxedModule.require("../../backend_plugins/filament-backend", {
                requires: {"q-io/fs": mockFS}
            });
        });

        it("lists the files and directories at the specified path without any deep traversal", function () {
            return filamentBackend.list("/simple/a")
                .then(function (fileDescriptors) {
                    expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                        "fs://localhost/simple/a/b.js", "fs://localhost/simple/a/c/"
                    ]);

                });
        });

        it("should ignore hidden files", function () {
            return filamentBackend.list("/ignore")
                .then(function (fileDescriptors) {
                    expect(fileDescriptors.map(function (desc) { return desc.url; })).toEqual([
                        "fs://localhost/ignore/node_modules/", "fs://localhost/ignore/ok.js"
                    ]);

                });
        });

    });

});

