var Montage = require("montage/core/core").Montage,
    EnvironmentBridge = require("core/environment-bridge").EnvironmentBridge;

exports.BrowserBridge = Montage.create(EnvironmentBridge, {

    projectInfo: {
        get: function () {
            return {"reelUrl": require.getPackage({name: "palette"}).location + "templates/component.reel"};
        }
    }

});
