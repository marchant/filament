var ProxyContext = require("palette/core/serialization/proxy-context").ProxyContext;

exports.ReelContext = ProxyContext.specialize({

    constructor: {
        value: function ReelContext() {
            this.super();
        }
    },

    getElementById: {
        value: function (id) {
            return this.editingDocument.nodeProxyForMontageId(id);
        }
    }

});
