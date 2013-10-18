// Represents a new object to create with a serialization and html.
// Value is an object with serializationFragment and htmlFragment properties
exports.PROTOTYPE_OBJECT = "x-filament/x-prototype-object";

// Represents a new HTML element
// Value is an HTML element in string format
exports.HTML_ELEMENT = "x-filament/x-html-element";

// Represents an element in the template with a data-montage-id
// Value is a string of the data-montage-id
exports.MONTAGE_TEMPLATE_ELEMENT = "x-filament/x-montage-template-element";

// Represents an element in the template without a data-montage-id
// Value is an XPath expression
exports.MONTAGE_TEMPLATE_XPATH = "x-filament/x-montage-template-xpath";

// Represents a label for an object in the serialization
// This can be used for e.g. to create a serialization reference
// ({"@": "label"}) or binding reference ("@label")
// Value is the label
exports.SERIALIZATION_OBJECT_LABEL = "x-filament/x-montage-serialization-object-reference";

// Represents an event dispatched from a specific object
// Value is an object with targetLabel and eventType properties
exports.MONTAGE_EVENT_TARGET = "x-filament/x-montage-event-target";

// Represents a binding 
// Value is an object with targetPath, oneway, sourcePath and converter properties
exports.MONTAGE_BINDING = "x-filament/x-montage-binding";
