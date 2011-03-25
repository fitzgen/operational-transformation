define([
    "./apply",
    "./xform",
    "./operations",
    "./messages"
], function (apply, xform, operations, messages) {

    function xformEach (outgoing, ops) {
        var i, len, msg;
        for ( i = 0, len = outgoing.length; i < len; i++ ) {
            msg = outgoing[i];
            xform(messages.operations(msg), ops, function (aPrime, bPrime) {
                messages.operations(msg, aPrime);
                messages.document(msg, apply(messages.document(msg), aPrime));
                messages.revision(msg, messages.revision(msg)+1);
                ops = bPrime;
            });
        }
    }

    function error (msg) {
        throw new Error(msg);
    }

    function connect (socket, docId) {
        socket.send({
            type: "connect",
            data: {
                id: id
            }
        });
    }

    function init (outgoing, socket, ui, initialData) {
        var previousDoc = messages.document(initialData),
            previousRevision = messages.revision(initialData),
            id = messages.id(initialData);

        ui.update(previousDoc);

        function loop () {
            var msg, uiDoc = ui.getDocument();
            if ( uiDoc !== previousDoc ) {
                msg = {};
                messages.operations(msg, operations.getOperations(previousDoc, uiDoc));
                messages.document(msg, uiDoc);
                messages.revision(msg, ++previousRevision);
                messages.id(msg, id);

                outgoing.push(msg);
                previousDoc = uiDoc;
            }
            setTimeout(loop, 50);
        }

        setTimeout(loop, 10);
    }

    return {
        OTDocument: function (opts) {
            var outgoing = [],
                socket = opts.socket || error("socket is required"),
                ui = opts.socket || error("ui is required");
                id = opts.id,
                initialized = false;

            connect(socket, id);

            // TODO: what happens if we receive an update message from the
            // server and we update the client and they lose what they were just
            // typeing because we havent saved the operations in the outgoing
            // buffer yet? Do I need to merge the main loop and handling of
            // socket messages? Maybe just have the socket's receive handler
            // queue events in an inbox and have the main loop process one
            // change that the client is creating, then one message from the
            // inbox.

            socket.receive(function (event) {
                var msg;

                switch ( event.type ) {

                case "init":
                    if ( ! initialized ) {
                        init(outgoing, socket, ui, event.data);
                    } else {
                        error("Already initialized");
                    }
                    break;

                case "update":
                    msg = event.data;
                    if ( isOurOutgoing(msg, outgoing) ) {
                        outgoing.shift();
                    } else {
                        // TODO: need to handle cursor selection and index
                        xformEach(outgoing, messages.operations(msg));
                        ui.update(messages.document(outgoing[outgoing.length-1]));
                    }

                    if ( outgoing.length > 0 ) {
                        socket.send({
                            type: "update",
                            data: outgoing[0]
                        });
                    }
                    break;

                default:
                    throw new Error("Unknown event type: " + event.type);

                }
            });
        }
    };

});