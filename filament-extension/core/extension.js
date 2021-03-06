var Target = require("montage/core/target").Target,
    Promise = require("montage/core/promise").Promise,
    MontageReviver = require("montage/core/serialization/deserializer/montage-reviver").MontageReviver,
    LibraryItem = require("core/library-item").LibraryItem,
    Map = require("montage/collections/map"),
    FILAMENT_EXTENSION = "filament-extension";

exports.Extension = Target.specialize( {

    constructor: {
        value: function Extension() {
            this.super();
            this._packageNameLibraryItemMap = new Map();
            this._packageNameIconUrlsMap = new Map();
        }
    },

    extensionRequire: {
        value: null
    },

    name: {
        get: function () {
            var re = new RegExp("\\/([^\\/]+?)\\." + FILAMENT_EXTENSION);
            return this.extensionRequire.packageDescription.name.replace(re, "");
        }
    },

    version: {
        get: function () {
            return this.extensionRequire.packageDescription.version;
        }
    },

    supportsFilamentVersion: {
        value: function (version) {
            return false;
        }
    },

    supportsModuleVersion: {
        value: function (moduleId, version) {
            return false;
        }
    },

    //TODO implement a base method that accepts some constrained
    // serviceProvider offered by filament
    //TODO should we keep track of whetherwe are active or not? (or is that recorded elsewhere) might be nice down here
    activate: {
        value: null
    },

    deactivate: {
        value: null
    },

    _packageNameLibraryItemMap: {
        value: null
    },

    _loadLibraryItemsForPackageName: {
        value: function (serviceProvider, packageName) {
            var self = this,
                extensionRequire = (this.extensionRequire) ? this.extensionRequire : require,
                location = (self.extensionRequire)? self.extensionRequire.location: self.packageLocation;

            //TODO what if the desired service isn't offered, is a different version; where are we resolving all of that?
            //TODO here, or in the service itself, we should find library items by package directory within the extension
            return serviceProvider.listLibraryItemUrls(location, packageName).then(function (urls) {
                return Promise.all(urls.map(function (url) {
                    var libraryItemModuleName = url.match(/([^\/]+)\.library-item\/$/m)[1],
                        templateUrl = url + libraryItemModuleName + ".html",
                        moduleJsonUrl = url + libraryItemModuleName + ".json";

                    return serviceProvider.loadLibraryItemJson(moduleJsonUrl).then(function (json) {
                            var libraryItem = new LibraryItem();

                            libraryItem.uri = url;
                            libraryItem.name = json.name;
                            if (json.libraryItem) {
                                libraryItem.description = json.description;
                            }
                            libraryItem.iconUrl = url + json.iconUrl;
                            libraryItem.require = extensionRequire;
                            libraryItem.templateUrl = templateUrl;
                            libraryItem.minVersion = json.minVersion;
                            libraryItem.maxVersion = json.maxVersion;

                            return libraryItem;
                        });
                }));
            }).then(function (libraryItems) {
                self._packageNameLibraryItemMap.set(packageName, libraryItems);
                return libraryItems;
            });
        }
    },

    installLibraryItems: {
        value: function (projectController, packageName) {
            var self = this;

            //TODO hmmm not sure I like going in here to get this, we should
            // probably pass along a bridge (or other service provider/extension interface) with
            // a subset of "safe" services in lieu of all these other bits and pieces of filament
            var serviceProvider = projectController.environmentBridge,
                libraryItems = this._packageNameLibraryItemMap.get(packageName),
                promisedLibraryItems;

            if (libraryItems) {
                promisedLibraryItems = Promise.resolve(libraryItems);
            } else {
                promisedLibraryItems = this._loadLibraryItemsForPackageName(serviceProvider, packageName);
            }

            return promisedLibraryItems.then(function (libraryItems) {
                for (var i = 0; i < libraryItems.length; i++) {
                    projectController.addLibraryItemToPackage(libraryItems[i], packageName);
                }
            }).then(function() { return self; });
        }
    },

    uninstallLibraryItems: {
        value: function (projectController, packageName) {

            if (this._packageNameLibraryItemMap) {
                for (var i = 0; i < this._packageNameLibraryItemMap.length; i++) {
                    projectController.removeLibraryItemFromPackage(this._packageNameLibraryItemMap[i], packageName);
                }
            }
            return Promise.resolve(this);
        }
    },

    _packageNameIconUrlsMap: {
        value: null
    },

    _loadIconUrlsForPackageName: {
        value: function (serviceProvider, packageName) {
            var location = (this.extensionRequire)? this.extensionRequire.location: this.packageLocation;

            return serviceProvider.listModuleIconUrls(location, packageName).then(function (urls) {

                return urls.reduce(function (iconMap, url) {
                    // NOTE the url for the icon captures the moduleId within the directory hierarchy;
                    // strip away everything but that hierarchy before parsing it with the MontageReviver's
                    // utility function
                    //e.g. "extension/icons/foo/bar/baz.png" is the icon representing the module "foo/bar/baz"
                    var moduleLocationFragment = url.replace(location + "icons/", "").replace(/\.[^\.]+$/m, ""),
                        iconModuleInfo = MontageReviver.parseObjectLocationId(moduleLocationFragment);

                    iconMap.set(iconModuleInfo.moduleId, url);
                    return iconMap;
                }, new Map());
            });
        }
    },

    installModuleIcons: {
        value: function (projectController, packageName) {
            var self = this;

            // TODO similar concern echoing that of installLibraryItems
            var serviceProvider = projectController.environmentBridge,
                moduleIdIconUrlMap = this._packageNameIconUrlsMap.get(packageName),
                promisedIconUrlMap;

            if (moduleIdIconUrlMap) {
                promisedIconUrlMap = Promise.resolve(moduleIdIconUrlMap);
            } else {
                promisedIconUrlMap = this._loadIconUrlsForPackageName(serviceProvider, packageName);
            }

            return promisedIconUrlMap.then(function (iconUrlMap) {
                var iconEntries = iconUrlMap.entries(),
                    iconEntry,
                    moduleId,
                    iconUrl;
                while (iconEntry = iconEntries.next().value) {
                    moduleId = iconEntry[0];
                    iconUrl = iconEntry[1];
                    projectController.addIconUrlForModuleId(iconUrl, moduleId);
                }
            }).then(function() { return self; });
        }
    },

    uninstallModuleIcons: {
        value: function (projectController, packageName) {

            var moduleIdIconUrlMap = this._packageNameIconUrlsMap.get(packageName),
                iconEntries,
                iconEntry,
                moduleId,
                iconUrl;

            if (moduleIdIconUrlMap) {
                iconEntries = moduleIdIconUrlMap.entries();

                while (iconEntry = iconEntries.next().value) {
                    moduleId = iconEntry[0];
                    iconUrl = iconEntry[1];
                    projectController.removeIconUrlForModuleId(iconUrl, moduleId);
                }
            }

            return Promise.resolve(this);
        }
    }

});
