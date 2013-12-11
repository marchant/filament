var FileDescriptor = require("adaptor/client/core/file-descriptor").FileDescriptor,
    AssetsManager = require("core/assets-management/assets-manager").AssetsManager,
    AssetTools = require("core/assets-management/asset-tools").AssetTools,
    AssetCategories = AssetsManager.create().assetCategories;

describe("asset-manager-spec", function () {

    describe("asset-manager", function () {

        var assetsManager = null;

        beforeEach(function () {
            var filesList = [],

                fakeFiles = [

                    // Valid
                    {
                        url: "/a/b/c/duck.dae",
                        mimeType: "model/vnd.collada+xml",
                        assetType: AssetCategories.MODEL
                    },
                    {
                        url: "/a/b/c/wine.dae",
                        mimeType: "model/vnd.collada+xml",
                        assetType: AssetCategories.MODEL
                    },
                    {
                        url: "/a/b/c/fall.png",
                        mimeType: "image/png",
                        assetType: AssetCategories.IMAGE
                    },
                    {
                        url: "/a/b/c/winter.jpg",
                        mimeType: "image/jpeg",
                        assetType: AssetCategories.IMAGE
                    },
                    {
                        url: "/a/b/c/beach.aac",
                        mimeType: "audio/aac",
                        assetType: AssetCategories.AUDIO
                    },
                    {
                        url: "/a/b/c/city.mp3",
                        mimeType: "audio/mpeg",
                        assetType: AssetCategories.AUDIO
                    },
                    {
                        url: "/a/b/c/mountain.mp4",
                        mimeType: "audio/aac",
                        assetType: AssetCategories.AUDIO
                    },
                    {
                        url: "/a/b/c/holiday.mp4",
                        mimeType: "video/mp4",
                        assetType: AssetCategories.VIDEO
                    },

                    // Not valid
                    {
                        url: "/a/b/c/file.zip",
                        mimeType: "application/zip",
                        assetType: null
                    },
                    {
                        url: "/a/b/c/file.json",
                        mimeType: "application/json",
                        assetType: null
                    },

                    {
                        url: "/a/b/c/file.au",
                        mimeType: "audio/basic",
                        assetType: null
                    }
                ];

            fakeFiles.forEach(function (file) {
                filesList.push(new FileDescriptor().init(file.url, {mode: 0, size:1024}, file.mimeType));
            });

            assetsManager = AssetsManager.create().init(filesList);

        });


        it("must has been correctly initialized", function () {
            var assets = assetsManager.assets;
            expect(assetsManager.assetsCount).toEqual(8); // do no include not asset files.
            expect(assets.MODEL.length).toEqual(2);
            expect(assets.IMAGE.length).toEqual(2);
            expect(assets.AUDIO.length).toEqual(3);
            expect(assets.VIDEO.length).toEqual(1);
        });


        it("should be able to get assets by type", function () {
            expect(assetsManager.getAssetsByAssetCategory(AssetCategories.IMAGE).length).toEqual(2);
        });


        it("should be able to get assets by mime-type", function () {
            expect(assetsManager.getAssetsByMimeType("audio/mpeg").length).toEqual(1);
            expect(assetsManager.getAssetsByMimeType("model/vnd.collada+xml").length).toEqual(2);

            var mimeTypeNoSupported = function () {
                assetsManager.getAssetsByMimeType("application/xml");
            };

            expect(mimeTypeNoSupported).toThrow();
        });


        it("should be able to get add an asset", function () {
            var fileDescriptor = new FileDescriptor().init("/assets/apple.png", {mode: 0}, "image/png"),
                createdAsset = assetsManager.createAssetWithFileDescriptor(fileDescriptor);

            assetsManager.addAsset(createdAsset);

            expect(assetsManager.assetsCount).toEqual(9);
            expect(assetsManager.assets.IMAGE.length).toEqual(3);
        });


        it("should be able to remove an asset", function () {
            assetsManager.removeAssetWithFileUrl("/assets/apple.png");

            expect(assetsManager.assetsCount).toEqual(8);
            expect(assetsManager.assets.IMAGE.length).toEqual(2);
        });

    });

    describe("asset-tools", function () {

        it("should be able to get some information from a fileUrl such as filename, name, extension", function () {
            var fileData = AssetTools.defineFileDataWithUrl("/a/b/c/winter.png");
            expect(fileData.fileName).toBe("winter.png");
            expect(fileData.name).toBe("winter");
            expect(fileData.extension).toBe("png");

            fileData = AssetTools.defineFileDataWithUrl("/a/b/c/winter.2003.jpg");
            expect(fileData.fileName).toBe("winter.2003.jpg");
            expect(fileData.name).toBe("winter.2003");
            expect(fileData.extension).toBe("jpg");

            fileData = AssetTools.defineFileDataWithUrl("file_no_extension");
            expect(fileData.fileName).toBe("file_no_extension");
            expect(fileData.name).toBe("file_no_extension");
            expect(fileData.extension).not.toBeDefined();

            fileData = AssetTools.defineFileDataWithUrl(0);
            expect(fileData).toBeNull();
        });


        it("should be able to find an 'asset type' from a supported mimeType", function () {
            var assetType = AssetTools.findAssetCategoryFromMimeType("audio/aac");
            expect(assetType).toBe(AssetCategories.AUDIO);

            assetType = AssetTools.findAssetCategoryFromMimeType("video/mp4");
            expect(assetType).toBe(AssetCategories.VIDEO);

            assetType = AssetTools.findAssetCategoryFromMimeType("application/mp4");
            expect(assetType).not.toBeDefined();
        });


        it("should be able to define if a mimeType is supported or not", function () {
            expect(AssetTools.isMimeTypeSupported("audio/aac")).toBe(true);
            expect(AssetTools.isMimeTypeSupported("model/vnd.collada+xml")).toBe(true);
            expect(AssetTools.isMimeTypeSupported("audio/wma")).toBe(false);
            expect(AssetTools.isMimeTypeSupported(0)).toBe(false);
        });


        it("should be able to define if a AssetType is supported or not", function () {
            expect(AssetTools.isAssetCategoryValid(AssetCategories.AUDIO)).toBe(true);
            expect(AssetTools.isAssetCategoryValid(AssetCategories.MODEL)).toBe(true);
            expect(AssetTools.isAssetCategoryValid("APPLICATION")).toBe(false);
            expect(AssetTools.isAssetCategoryValid(0)).toBe(false);
        });


        it("should be able to define if a fileUrl is valid", function () {
            expect(AssetTools.isFileUrlValid('/a/b/d.js')).toBe(true);
            expect(AssetTools.isFileUrlValid('rrr.a/b/d.js')).toBe(true);
            expect(AssetTools.isFileUrlValid('rrr.a/b/d.js/')).toBe(false);
        });

    });

});
