define(["../errors"], function (errors) {

    var documents = {};

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
                callback(null, documents[id]);
            }, 10);
        },

        getDocument: function (id, callback) {
            setTimeout(function () {
                if ( id in documents ) {
                    callback(null, documents[id]);
                } else {
                    callback(new errors.NoSuchDocument("No document with id = " + id),
                             null);
                }
            }, 10);
        },

        saveDocument: function (doc, callback) {
            setTimeout(function () {
                if ( doc.id in documents ) {
                    if ( doc.rev === documents[doc.id].rev + 1 ) {
                        documents[doc.id] = doc;
                        callback(null, documents[doc.id]);
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