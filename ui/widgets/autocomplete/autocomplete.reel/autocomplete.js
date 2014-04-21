
/**
    @module "matte/ui/autocomplete/autocomplete.reel"
*/

var TextInput = require("matte/ui/text-input").TextInput,
    logger = require("montage/core/logger").logger("autocomplete"),
    ResultsList = require("../results-list.reel/results-list").ResultsList,
    Popup = require("matte/ui/popup/popup.reel").Popup,
    PressComposer = require("montage/composer/press-composer").PressComposer,
    RangeController = require("montage/core/range-controller").RangeController,
    KeyComposer = require("montage/composer/key-composer").KeyComposer;

var KEY_UP = 38,
    KEY_DOWN = 40,
    KEY_ENTER = 13,
    KEY_DOT = 190;

var getElementPosition = function(obj) {
    var curleft = 0, curtop = 0, curHt = 0, curWd = 0;
    if (obj.offsetParent) {
        do {
            curleft += obj.offsetLeft;
            curtop += obj.offsetTop;
            curHt += obj.offsetHeight;
            curWd += obj.offsetWidth;
        } while ((obj = obj.offsetParent));
    }
    return {
        top: curtop,
        left: curleft,
        height: curHt,
        width: curWd
    };
};

/**
    The Autocomplete component
    @class module:"matte/ui/autocomplete/autocomplete.reel".Autocomplete
    @extends module:matte/ui/text-input.TextInput
*/
exports.Autocomplete = TextInput.specialize(/** @lends module:"matte/ui/autocomplete/autocomplete.reel".Autocomplete# */ {

    constructor: {
        value: function Autocomplete() {
            this.super();
            this.delay = 500;
            this.minLength = 2;

            this.classList.add("matte-InputText");
        }
    },

    hasTemplate: {value: true},

/**
    The AutoComplete instance's delegate object.
    @type {Object}
*/
    delegate: {
        value: null
    },

    /**
    * If the delegate returns Objects, this property can be used to derive the
    * display string for an object. If this property is not provided, the results
    * provided by the delegate are assumed to be String.
    @type {String}
    */
    textPropertyPath: {
        value: null
    },

/**
    The string separator to use between tokens in the AutoComplete.
    @type {String}
    @default {Boolean} ","
*/
    separator: {
        value: ',',
        distinct: true
    },

    _delay: {value: null},

/**
    The delay in milliseconds between when the user modifies the input field and when the query to retrieve suggestions is executed.
    @type {Number}
    @defaultvalue 500
*/
    delay: {
        get: function(){
            return this._delay;
        },
        set: function(value) {
            if(value !== this._delay) {
                if(typeof value === "string") {
                    value = parseInt(value, 10);
                }
                this._delay = value;
            }
        }
    },

    /**
    * The number of characters the user must type before the query for suggeseted tokens executes.
    * @type {Number}
    */
    minLength: {
        value: null
    },

    _tokens: {value: null},
/**
    Gets and sets the tokens being displayed by the AutoComplete component.
    @type {Array}
*/
    tokens: {
        get: function() {
            return this._tokens;
        },
        set: function(value) {
            this._tokens = value;
            this._valueSyncedWithInputField = false;
            this.needsDraw = true;
        },
        modify: function(v) {
            this._tokens = v;
        }
    },

    acceptsActiveTarget: {
        value: true
    },

    // overridden here to get the substring/searchString
    value: {
        get: function() {
            return this._value;
            //var arr = this.tokens;
            //return (arr ? arr.join(',') : this._value);
        },
        set: function(newValue, fromInput) {
            this._value = newValue ? newValue.trim() : '';

            // get the entered text after the separator
            var value = this._value;

            if(value) {
                var arr = value.split(this.separator.value).map(function(item) {
                    return item.trim();
                });
                this.activeTokenIndex = this._findActiveTokenIndex(this.tokens, arr);
                this._tokens = value.split(this.separator.value).map(function(item) {
                    return item.trim();
                });
            } else {
                this.activeTokenIndex = 0;
                this._tokens = [];
            }

            if(fromInput) {
                this._valueSyncedWithInputField = true;
                this.showPopup = false;
                if(this._tokens.length && this._tokens.length > 0) {
                    var searchTerm = this._tokens[this.activeTokenIndex];
                    searchTerm = searchTerm ? searchTerm.trim() : '';
                    if(searchTerm.length >= this.minLength) {
                        var self = this;
                        clearTimeout(this.delayTimer);
                        this.delayTimer = setTimeout(function() {
                            self.delayTimer = null;
                            if (logger.isDebug) {
                                logger.debug('SEARCH for ', searchTerm);
                            }
                            self.performSearch(searchTerm);
                        }, this.delay);
                    }
                }

            } else {
                this._valueSyncedWithInputField = false;
                this.needsDraw = true;
            }
        }
    },



    //----  Private

    // width of the popup
    overlayWidth: {
        value: null,
        enumerable: false
    },

    delayTimer: {
        value: null,
        enumerable: false
    },

    // valid values are 'loading', 'complete' and 'timeout'
    // --> ResultList.loadingStatus
    _loadingStatus: {value: false, enumerable: false},
    loadingStatus: {
        enumerable: false,
        get: function() {
            return this._loadingStatus;
        },
        set: function(value) {
            this._loadingStatus = value;
            if(this._loadingStatus === 'loading') {
                this.showPopup = false;
            }
            this.needsDraw = true;
        }
    },

    // the index of the token in the tokens Array that is being worked on
    activeTokenIndex: {value: null},

    /** @private */
    _findActiveTokenIndex: {
        enumerable: false,
        value: function(before, after) {
            if(!before || !after) {
                return 0;
            }
            var i = 0;
            while (before[i] === after[i]) {
                if (i < after.length - 1) {
                    i++;
                } else {
                    return i;
                }
            }
            return i;
        }
    },


    // -> resultsController.activeIndexes
    _activeIndexes: {value: null, enumerable: false},
    activeItemIndex: {
        enumerable: false,
        get: function() {
            if(this._activeIndexes && this._activeIndexes.length > 0) {
                return this._activeIndexes[0];
            }
            return null;
        },
        set: function(value) {
            if(value == null) {
                this._activeIndexes = [];
            } else {
                this._activeIndexes = [value];
            }

        }
    },

    _suggestedValue: {value: null},
    suggestedValue: {
        enumerable: false,
        get: function() {
            return this._suggestedValue;
        },
        set: function(aValue) {
            this._suggestedValue = aValue;
            if(aValue) {

                var arr = this.tokens || [];
                var token;

                if(typeof aValue === "string") {
                    token = aValue;
                } else {
                    if(this.textPropertyPath) {
                        token = aValue[this.textPropertyPath];
                    } else {
                        token = '';
                    }
                }

                arr[this.activeTokenIndex] = token;
                this.tokens = arr;
                this.showPopup = false;
            }
        }
    },

    // private

    popup: {
        enumerable: false,
        value: null
    },

    _showPopup: {value: null},
    showPopup: {
        enumerable: false,
        get: function() {
            return this._showPopup;
        },
        set: function(value) {
            if(value !== this._showPopup) {
                this._showPopup = value;
                this.needsDraw = true;
            }
        }
    },

    // the delegate should set the suggestions.
    // suggestions -> resultsController.content
    _suggestions: {value: null},
    suggestions: {
        enumerable: false,
        get: function() {
            return this._suggestions;
        },
        set: function(value) {
            if (logger.isDebug) {
                logger.debug('got suggestions: ', value);
            }
            this.loadingStatus = 'complete';
            this._suggestions = value;
            this.showPopup = (value && value.length > 0);
            this.needsDraw = true;
        }
    },

    // resultsController -> resultsList.contentController
    resultsController: {
        enumerable: false,
        value: null
    },

    // repetition
    resultsList: {
        enumerable: false,
        value: null
    },

    performSearch: {
        enumerable: false,
        value: function(searchTerm) {
            if (this.delegate) {
                this.resultsController.selectedIndexes = [];
                // index on the popup
                this.activeItemIndex = 0;
                this.loadingStatus = 'loading';
                this.callDelegateMethod('ShouldGetSuggestions', this, searchTerm);
            }
        }
    },


    _addEventListeners: {
        enumerable: false,
        value: function() {
            this.element.addEventListener("keyup", this);
            this.element.addEventListener("keydown", this);
            this.element.addEventListener("input", this);
        }
    },

    _removeEventListeners: {
        enumerable: false,
        value: function() {
            this.element.removeEventListener("keyup", this);
            this.element.removeEventListener("keydown", this);
            this.element.removeEventListener("input", this);
        }
    },

    _getPopup: {
        enumerable: false,
        value: function() {

            var popup = this.popup;

            if (!popup) {
                popup = new Popup();
                popup.content = this.resultsList;
                popup.classList.add("matte-Autocomplete--popup");
                popup.anchor = this.element;
                popup.delegate = this;
                // dont let the popup take away the focus
                // we need the focus on the textfield
                popup.focusOnShow = false;
                this.popup = popup;
            }
            return this.popup;

        }
    },

    // Delegate method to position the suggest popup
    willPositionPopup: {
        value: function(popup, defaultPosition) {
            var anchor = popup.anchorElement, anchorPosition = getElementPosition(anchor);
            return {
                left: anchorPosition.left,
                top: anchorPosition.top + 30
            };

        }
    },

    cancelCompletionComposer: {
        value: null
    },

    enterDocument: {
        value: function(firstTime) {
            if (firstTime) {
                this._addEventListeners();
                this.element.classList.add('matte-Autocomplete');

                this.cancelCompletionComposer = KeyComposer.createKey(this, "escape", "cancelCompletion");
                this.cancelCompletionComposer.addEventListener("keyPress", this);

                // create the Repetition for the suggestions
                this.resultsController = new RangeController();
                this.defineBinding("resultsController.content", {
                    "<-": "suggestions"
                });
                this.defineBinding("suggestedValue", {
                    "<-": "resultsController.selection[0]"
                });

                this.resultsList = new ResultsList();
                this.defineBinding("resultsList.contentController", {
                    "<-": "resultsController"
                });
                this.defineBinding("resultsList.activeIndexes", {
                    "<-": "_activeIndexes"
                });
                this.defineBinding("resultsList.textPropertyPath", {
                    "<-": "textPropertyPath"
                });

                this._getPopup();
            }
        }
    },

    prepareForActivationEvents: {
        value: function() {
            // add pressComposer to handle the claimPointer related work
            var pressComposer = new PressComposer();
            this.addComposer(pressComposer);
        }
    },

    draw: {
        value: function() {
            this.super();

            if (!this._valueSyncedWithInputField) {
                if (this.tokens) {
                    this.value = this.tokens.join(this.separator.value);
                }
                if (this.value && this.value.charAt(this.value.length-1) !== this.separator.value) {
                    this.value += this.separator.value;
                }
                this.element.value = this.value;
                this._valueSyncedWithInputField = true;
            }
            var showPopup = this.showPopup;
            if (this.value === '' && this.minLength > 0) {
                showPopup = false;
            }

            if (showPopup) {
                this.popup.show();
                // reset active index
                this.activeItemIndex = 0;
            } else {
                if (this.popup && this.popup.displayed) {
                    this.popup.hide();
                }
            }

            var isLoading = (this.loadingStatus === 'loading');
            this.element.classList[isLoading ? 'add' : 'remove']('matte-Autocomplete--loading');


        }
    },

    handleKeydown: {
        value: function (evt) {
            var code = evt.keyCode,
                popup = this._getPopup();
            switch(code) {
            case KEY_DOWN:
                evt.preventDefault();
                break;

            case KEY_UP:
                evt.preventDefault();
                break;

            case KEY_DOT:
                if (popup.displayed) {
                    evt.preventDefault();
                }
                break;
            }
        }
    },

    handleCancelCompletionKeyPress: {
        value: function (evt) {
            if (this.showPopup) {
                evt.stopPropagation();
                evt.preventDefault();
                this.showPopup = false;
            }
        }
    },

    surrendersActiveTarget: {
        value: function (newTarget) {
            var popup = this._getPopup();
            if (popup.displayed) {
                this.resultsController.selection = [this.suggestions[this.activeItemIndex]];
            }
            return true;
        }
    },

    handleKeyup: {
        enumerable: false,
        value: function(e) {
            var code = e.keyCode,
                popup = this._getPopup();

            switch (code) {
            case KEY_DOWN:
                if (!popup.displayed) {
                    popup.show();
                    var searchTerm = this._tokens[this.activeTokenIndex] || "";
                    this.performSearch(searchTerm);
                    this.activeItemIndex = 0;
                } else {
                    this._highlightNext();
                }

                break;

            case KEY_UP:
                if (popup.displayed) {
                    this._highlightPrevious();
                }

                break;

            case KEY_ENTER:
                if (popup.displayed) {
                    this.resultsController.selection = [this.suggestions[this.activeItemIndex]];
                    e.preventDefault();
                    // select the currently active item in the results list
                } else {
                    this._dispatchActionEvent();
                }

                break;

            case KEY_DOT:
                if (popup.displayed) {
                    var suggestion = this.suggestions[this.activeItemIndex],
                        newSuggestion = suggestion + ".";

                    this.suggestedValue = newSuggestion;
                    this.resultsController.selection = [newSuggestion];
                    this.performSearch(newSuggestion);
                }

                break;

            }
            this.element.focus();
        }
    },

    _highlightPrevious: {
        value: function () {
            if (this.activeItemIndex > 0) {
                this.activeItemIndex--;
            } else {
                this.activeItemIndex = 0;
            }
        }
    },

    _highlightNext: {
        value: function () {
            var list = this.suggestions || [];
            if (list.length > 0 && this.activeItemIndex < list.length-1) {
                this.activeItemIndex++;
            } else {
                this.activeItemIndex = 0;
            }
        }
    }

});

