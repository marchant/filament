var AssetsConfig = {

    assetCategories: {

        MODEL: {
            categoryName: "MODEL",
            defaultIconUrl: "assets/icons/default-model-icon.png",
            mimeTypes: [
                "model/vnd.collada+xml"
            ]
        },

        IMAGE: {
            categoryName: "IMAGE",
            defaultIconUrl: "assets/icons/default-image-icon.png",
            mimeTypes: [
                "image/jpeg",
                "image/jp2",
                "image/png",
                "image/gif",
                "image/svg+xml"
            ]
        },

        AUDIO: {
            categoryName: "AUDIO",
            defaultIconUrl: "assets/icons/default-audio-icon.png",
            mimeTypes: [
                "audio/aac",
                "audio/mpeg",
                "audio/x-flac",
                "audio/x-aiff",
                "audio/x-wav"
            ]

        },

        //TODO add more mime-types
        VIDEO: {
            categoryName: "VIDEO",
            defaultIconUrl: "assets/icons/default-video-icon.png",
            mimeTypes: [
                "video/mp4",
                "video/3gpp",
                "video/3gpp2",
                "video/quicktime",
                "video/mpeg"
            ]
        }

    }

};

exports.AssetsConfig = AssetsConfig;
