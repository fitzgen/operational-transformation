define(["util"], function (util) {

    var exports = {};

    function defineError (name, Parent) {
        Parent = Parent || Error;
        exports[name] = function (msg) {
            Parent.call(this, msg);
        };
        util.inherits(exports[name], Parent);
        exports[name].prototype.name = name;
    }

    defineError("BadRevision");
    defineError("NoSuchDocument");

    return exports;

});