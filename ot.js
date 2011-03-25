// This module is the server's equivalent of `./client.js`; that is, it provides
// the high level Operational Transformation API for the server side of
// things. You just need to pass it a store parameter which allows it to get,
// save, and create documents in whatever backend you choose. It is an event
// emitter, and it is assumed that you will listen to these events that it emits
// and have some type of communication layer with the clients to let them know
// of new updates and which operations have been applied to the master document.


define(['events'], function (events) {

    function nop () {}

    function error (msg) {
        throw new Error(msg);
    }

    return function (opts) {
        var store = opts.store || error('store is required'),
            manager = new events.EventEmitter();

        manager.newDocument = function (callback) {
            callback = callback || nop;
            store.newDocument(function (err, doc) {
                if ( err ) {
                    this.emit("error", err);
                    return callback(err, null);
                } else {
                    this.emit("new", doc);
                    return callback(null, doc);
                }
            }.bind(this));
        };

        manager.applyOperations = function (message) {
            var id = message.id,
                parentRev = message.rev,
                ops = message.ops,
                emit = this.emit.bind(this);

            store.getDocument(id, function (err, doc) {
                if ( err ) {
                    emit("error", err);
                } else {
                    if ( rev === doc.rev ) {
                        try {
                            doc.doc = apply(ops, doc.doc);
                        } catch (err) {
                            emit("error", err);
                            return;
                        }

                        doc.rev++;
                        store.saveDocument(doc, function (err, doc) {
                            if ( err ) {
                                // Bad revisions aren't considered an error at this
                                // level, just ignored.
                                if ( ! (err instanceof errors.BadRevision) ) {
                                    emit("error", err);
                                }
                            } else {
                                emit("update", doc);
                            }
                        });
                    }
                }
            });
        };

        return manager;
    };

});