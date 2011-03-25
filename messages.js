define(function () {

    function defineGetSet (prop) {
        return function (obj, val) {
            return arguments.length == 2
                ? obj[prop] = val
                : obj[prop];
        };
    }

    return {
        document: defineGetSet("doc"),
        revision: defineGetSet("rev"),
        operations: defineGetSet("ops"),
        id: defineGetSet("id")
    };

});