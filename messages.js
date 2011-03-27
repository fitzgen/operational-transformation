// This modules loosely defines the message protocol used to pass operations and
// documents between the client and server. Mostly it is just a common
// abstraction both the client and server can use when creating, manipulating,
// and using messages.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(function () {

    function defineGetSet (prop) {
        return function (obj, val) {
            return arguments.length === 2
                ? obj[prop] = val
                : obj[prop];
        };
    }

    return {
        // The 'document' attribute is only defined for server responses to a
        // client connect.
        document: defineGetSet("doc"),
        revision: defineGetSet("rev"),
        operations: defineGetSet("ops"),
        id: defineGetSet("id")
    };

});