/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define, setTimeout */

define(["../errors"], function (errors) {

    var documents = {};

    function isPrimitive (obj) {
        return obj === null || typeof obj !== "object";
    }

    function deepCopy (obj) {
        var copy, k;
        if ( isPrimitive(obj) ) {
            return obj;
        } else {
            copy = {};
            for ( k in obj ) {
                if ( obj.hasOwnProperty(k) ) {
                    copy[k] = deepCopy(obj[k]);
                }
            }
            return copy;
        }
    }

    return {

        newDocument: function (callback) {
            setTimeout(function () {
                var id;
                do {
                    id = (new Date()).getTime() + Math.floor(Math.random() * 1000);
                } while ( id in documents );
                documents[id] = {
                    id: id,
                    rev: 0,
                    doc: ""
                };
                callback(null, deepCopy(documents[id]));
            }, 10);
        },

        getDocument: function (id, callback) {
            console.log("inside getDocument");
            setTimeout(function () {
                console.log("inside getDocument's callback");
                if ( id in documents ) {
                    console.log("inside getDocument's callback, success");
                    callback(null, deepCopy(documents[id]));
                } else {
                    console.log("inside getDocument's callback, error");
                    callback(new errors.NoSuchDocument("No document with id = " + id),
                             null);
                }
            }, 10);
        },

        saveDocument: function (doc, callback) {
            setTimeout(function () {
                if ( doc.id in documents ) {
                    console.log(doc.rev, documents[doc.id].rev);
                    if ( doc.rev === documents[doc.id].rev + 1 ) {
                        documents[doc.id] = deepCopy(doc);
                        callback(null, deepCopy(documents[doc.id]));
                    } else {
                        callback(new errors.BadRevision("Bad revision"), null);
                    }
                } else {
                    callback(new errors.NoSuchDocument("No document with id = " + doc.id),
                             null);
                }
            }, 10);
        }

    };

});