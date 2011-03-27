// This module provides all of the custom errors defined by this library.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define, setTimeout */

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