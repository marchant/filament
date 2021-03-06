/*jshint browser:true */
/**
 * @module ui/menu-item.reel
 * @requires montage/ui/component
 */
var Component = require("montage/ui/component").Component,
    KeyComposer = require("montage/composer/key-composer").KeyComposer;

/**
 * @class MenuItem
 * @extends Component
 */
exports.MenuItem = Component.specialize(/** @lends MenuItem# */ {
    constructor: {
        value: function MenuItem() {
            this.super();

            this.isMac = /Macintosh/i.test(navigator.userAgent);
            this.isWindows = /Windows/i.test(navigator.userAgent);
            this.isLinux = /Linux/i.test(navigator.userAgent);
        }
    },

    _keyComposer: {
        value: null
    },

    _menuItemModel: {
        value: null
    },

    overlayPosition: {
        value: "down"
    },

    menuFlashing: {
        value: false
    },

    keys: {
        value: null
    },

    ignoreAction : {
        value: false
    },

    actionEventName: {
        value: "menuAction"
    },

    validateEventName: {
        value: "menuValidate"
    },

    dispatchTarget :{
        value : null
    },

    isMac: {
        value: null
    },

    isWindows: {
        value: null
    },

    isLinux: {
        value: null
    },

    enterDocument: {
        value: function (firstTime) {
            if (!firstTime) { return; }
            this.element.addEventListener("mouseover", this, false);
            this.element.addEventListener("mouseout", this, false);
            this.element.addEventListener("mouseup", this, false);
            this.element.addEventListener("mousedown", this, false);

            this.templateObjects.menuButton.element.addEventListener("mouseleave", this, false);

            if (this.isRootMenu()) {
                this.addEventListener("menuFlashing", this, false);
            }
        }
    },

    isOpen: {
        value: false
    },

    open: {
        value: function (position) {
            var menu = this.menu,
                activePath = menu.activePath;

            this.isOpen = true;
            activePath.push(this);

            this.templateObjects.contextualMenu.show(position);
        }
    },

    _closeActivePathUpdate: {
        value: function () {
            var menu = this.menu,
                activePath = menu.activePath,
                i = activePath.indexOf(this);

            this.isOpen = false;
            if (i > 0) {
                activePath.splice(i, activePath.length - i);
            } else {
                menu.activePath = [];
            }
        }
    },

    close: {
        value: function () {
            this._closeActivePathUpdate();
            this.templateObjects.contextualMenu.hide();
        }
    },

    handleMenuFlashing: {
        value: function (evt) {
            this.menuFlashing = true;
            this.needsDraw = true;
        }
    },

    iconForKeyMap: {
        value: {
            //"⇤" "&larrb;"
            "backspace":        String.fromCharCode(8676),
            //"⇥ "&rarrb;"
            "tab":              String.fromCharCode(8677),
            //"⇧" "&#8679;"
            "shift":            String.fromCharCode(8679),
            //"⇪" "&#8682;"
            "capslock":         String.fromCharCode(8682),
            //"←" "&larr;"
            "left":             String.fromCharCode(8592),
            "up":               String.fromCharCode(8593),
            "right":            String.fromCharCode(8594),
            "down":             String.fromCharCode(8595),
            //"↵" "&crarr;"
            "enter":            String.fromCharCode(8629),
            //"⌫" &#9003;
            "delete":           String.fromCharCode(9003),
            "plus":             "+",
            "minus":            "-",
            "period":           ".",
            "comma":            ","
        }
    },

    /* jshint -W074 */
    // JSHint bug https://github.com/jshint/jshint/issues/840
    iconForKey: {
        value: function (key) {
            if (key in this.iconForKeyMap) {
                return this.iconForKeyMap[key];
            }

            switch (key) {
            //"⌘" "&#8984;"
            case "meta":
            case "window":
            case "win":
            case "command":
            case "cmd":
                key = (this.isMac) ? String.fromCharCode(8984) : "Cmd";
                break;
            //"⎋" "&#9099;"
            case "escape":
                key = (this.isMac)? String.fromCharCode(9099) : "Esc";
                break;
            //"⌃"
            case "ctrl":
            case "control":
                key = (this.isMac)? String.fromCharCode(8963) : "Ctrl";
                break;
            //"⌥" "&#8997;"
            case "option":
                key = (this.isMac)? String.fromCharCode(8997) : "Alt";
                break;
            default:
                key = key.charAt(0).toUpperCase() + key.slice(1);
            }
            return key;
        }
    },
    /* jshint +W074 */

    updateKeys: {
        value: function (keyEquivalent) {
            var self = this,
                keys = keyEquivalent.split("+");

            this.keys = keys.map(function (key){
                key = key.trim();
                return self.iconForKey(key);
            });
        }
    },

    menuItemModel: {
        get: function () {
            return this._menuItemModel;
        },
        set: function (value) {
            if (value === this._menuItemModel) {
                return;
            }

            this._menuItemModel = value;

            if (this._menuItemModel) {
                var keyEquivalent = this._menuItemModel.keyEquivalent;

                if (keyEquivalent) {
                    this._keyComposer = KeyComposer.createGlobalKey(this, keyEquivalent, "menuAction");
                    this.loadComposer(this._keyComposer);
                    this.addComposer(this._keyComposer);
                    this._keyComposer.addEventListener("keyPress", this, false);
                    this.updateKeys(keyEquivalent);
                }
            }
        }
    },

    // If a dispatchTarget is specified we use it instead of activeTarget
    // This is for example used to differenciate events from the right click menu and the main menu.
    _dispatchAction: {
        value: function (component) {
            if (this.dispatchTarget) {
                this.dispatchTarget.dispatchEventNamed(this.actionEventName, true, true, this.menuItemModel);
            } else {
                this.menuItemModel.dispatchMenuEvent(this.actionEventName);
            }
        }
    },

    _dispatchValidate: {
        value: function (menuItem) {
            if (this.dispatchTarget) {
                this.dispatchTarget.dispatchEventNamed(this.validateEventName, true, true, menuItem);
            } else {
                menuItem.dispatchMenuEvent(this.validateEventName);
            }
        }
    },

    handleKeyPress: {
        value: function(event) {
            if (event.identifier === "menuAction" && this.menuItemModel) {
                event.preventDefault();
                event.stopPropagation();
                this.dispatchEventNamed("menuFlashing", true, true);
                this._dispatchAction();
            }
        }
    },

    _toggleContextualMenu: {
        value: function (element) {
            var menuPositions = element.getBoundingClientRect(),
                contextualMenuPosition;

            if (!this.menuItemModel.items || !this.menuItemModel.items.length) {
                return;
            }

            if (this.overlayPosition === "down") {
                contextualMenuPosition = {top: menuPositions.bottom, left: menuPositions.left};
            } else if (this.overlayPosition === "right") {
                contextualMenuPosition = {top: menuPositions.top, left: menuPositions.right};
            } else if (this.overlayPosition === "left") {
                contextualMenuPosition = {top: menuPositions.top, right: menuPositions.left};
            }

            if (!this.isOpen) {
                this.open(contextualMenuPosition);
            } else {
                this.close();
            }
        }
    },

    _openSubmenu: {
        value: function () {
            var element = this.templateObjects.menuButton.element,
                self = this;
            this._toggleContextualMenu(element);

            if (this.isOpen) {
                this.menuItemModel.items.forEach(function (item) {
                    self._dispatchValidate(item);
                });
            }
        }
    },

    _triggerAction: {
        value: function () {
            this._dispatchAction();
            this.dispatchEventNamed("dismissContextualMenu", true, false);
        }
    },

    _buttonAction: {
        value: function (element) {
            if (!this.menuItemModel) {
                return;
            }

            if (this.menuItemModel.items && this.menuItemModel.items.length) {
                this._openSubmenu();
            } else {
                this._triggerAction();
            }
        }
    },

    handleMenuButtonAction: {
        value: function (evt) {
            evt.stop();
        }
    },

    isSubMenu: {
        value: function () {
            return (this.menuItemModel && this.menuItemModel.items && this.menuItemModel.items.length && !this.isRootMenu());
        }
    },

    isRootMenu: {
        value: function () {
            return (this.parentMenuItem === this);
        }
    },

    handleMouseover: {
        value: function (evt) {
            var activePath = this.menu.activePath;
            evt.stop();

            // CSS's pseudo class hover is not applied durring a drag, this is a workaround [1/2]
            this.templateObjects.menuButton.classList.add("over");


            // Closing sub menus
            if (activePath.length) {
                var parentIndex = activePath.indexOf(this.parentMenuItem);
                for (var i = parentIndex + 1; i < activePath.length; i++) {
                    activePath[i].close();
                }
                activePath.slice(parentIndex, activePath.length);
            }

            // Open a submenu
            if (this.isSubMenu() && !this.templateObjects.contextualMenu.isOpen) {
                this._openSubmenu();
                return;
            }

            // Root menuItem hover act like click if there is already a sub menu open
            if (this.isRootMenu() && activePath.length && this !== activePath[0]) {
                this._buttonAction();
            }
        }
    },

    handleMousedown: {
        value: function (evt) {
            evt.stop();

            if (this.ignoreAction) {
                this.ignoreAction = false;
                return;
            }

            if (this.isSubMenu() || this.isRootMenu()) {
                this._openSubmenu();
            }
        }
    },

    handleMouseup: {
        value: function (evt) {
            if (!this.isSubMenu()) {
                this._triggerAction();
            }
            // CSS's pseudo class hover is not applied durring a drag, this is a workaround [2/2]
            this.templateObjects.menuButton.classList.remove("over");
        }
    },

    // Prevent button to wait for the end of the press event to stop being displayed as active
    handleMouseleave: {
        value: function (evt) {
            this.templateObjects.menuButton.active = false;
        }
    },

    handleMouseout: {
        value: function (evt) {
            // CSS's pseudo class hover is not applied durring a drag, this is a workaround [2/2]
            this.templateObjects.menuButton.classList.remove("over");
        }
    },

    // Event fired from a sub-menu asking for it's closure
    // Typical use is to dismiss a menu after firing a menu event
    handleDismissContextualMenu: {
        value: function (evt) {
            this.close();
        }
    },

    // Event fired to informed that the contextMenu is being closed
    // This happens for example, when the overlay loses active target
    handleHideContextualMenu: {
        value: function (evt) {
            this._closeActivePathUpdate();
        }
    },

    // To prevent dispatching events from itself, preserve the
    // activeTarget
    // TODO while clever, we might need to actually accept activeTarget for usability
    // and instead store whom to dispatch from once we've "stolen" the activeTarget status
    acceptsActiveTarget: {
        get: function () {
            if (this.isOpen) {
                this.ignoreAction = true;
            }
            this.nextTarget = this.eventManager.activeTarget;
            return false;
        }
    },

    draw: {
        value: function () {
            if (this.keys && this.keys.length) {
                var delimitator = (this.isMac) ? "" : "+";
                this.templateObjects.menuButton.element.dataset.shortcut = this.keys.join(delimitator);
            }

            if (this.menuFlashing) {
                if(this.element.classList.contains("Flashing")) {
                    this.element.classList.remove("Flashing");
                    this.needsDraw = true;
                } else {
                    this.element.classList.add("Flashing");
                    this.menuFlashing = false;
                }
            }
        }
    }

});
