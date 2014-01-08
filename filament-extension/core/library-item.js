var Montage = require("montage").Montage;

/**
 * A LibraryItem is the transport mechanism for a template
 * intended to be merged into another template. A LibraryItem
 * itself is not a component, nor should the template it
 * represents be considered a standalone component.
 *
 * Filament presents these LibraryItems in a collection and
 * offers to merge them into a template being edited; the
 * end result being that the one or many templateObjects
 * captured in the LibraryItem's template are injected into
 * destination template. Other linked assets such as
 * associated DOM nodes, linked CSS, and images are also
 * included.
 *
 * LibraryItems can be identified by a valid URI. If the URI is
 * a reachable URL the expectation is that the URL is
 * itself a valid LibraryItem.
 *
 * A LibraryItem need not be backed by information at a reachable URL;
 * it could be created on the fly with sufficient data to yield a valid
 * and fully operational LibraryItem. This may be the case when a
 * LibraryItem is constructed to represent templateObjects copied from
 * an existing template.
 * @type {LibraryItem}
 */
exports.LibraryItem = Montage.specialize( {

    constructor: {
        value: function LibraryItem() {
            this.super();
        }
    },

    /**
     * The URI that represents this LibraryItem
     */
    uri: {
        value: null
    },

    /**
     * The name of this LibraryItem
     */
    name: {
        value: null
    },

    /**
     * The url of the icon used to represent this LibraryItem
     */
    iconUrl: {
        value: null
    },

    /**
     * The require object to use when loading the template and other resources
     * relative to this libraryItem, though really the require is relative to
     * the extensions that provides this LibraryItem, and others.
     *
     * Typically, it is not uniquely rooted to this libraryItem alone;
     * a libraryItem is not typically a package itself.
     */
    require: {
        value: null
    },

    /**
     * The moduleId of the template backing this libraryItem relative to this
     * libraryItem's require
     */
    templateModuleId: {
        value: null
    },

    /**
     * The string content of a valid template this LibraryItem represents
     */
    templateContent: {
        value: null
    }
});
