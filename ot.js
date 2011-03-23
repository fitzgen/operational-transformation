define(['events'], function (events) {

    function nop () {}

    return function (opts) {
        var store = opts.store || require("./stores/memory-store"),
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