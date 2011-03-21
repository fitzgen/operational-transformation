var util = require("util");

function defineError (name) {
    Parent = Parent || Error;
    exports[name] = function (msg) {
        Parent.call(this, msg);
    };
    util.inherits(exports[name], Parent);
    exports[name].prototype.name = name;
}

defineError("BadRevision");
defineError("NoSuchDocument");