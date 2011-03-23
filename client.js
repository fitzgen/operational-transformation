define(["./apply", "./xform", "./operations"], function (apply, xform, operations) {

    function defineGetSet (prop) {
        return function (obj, val) {
            return arguments.length == 2
                ? obj[prop] = val
                : obj[prop];
        };
    }

    var messageDocument = defineGetSet("doc");
    var messageRevision = defineGetSet("rev");
    var messageOperations = defineGetSet("ops");
    var messageId = defineGetSet("id");

    function xformEach (outgoing, ops) {
        var i, len, msg;
        for ( i = 0, len = outgoing.length; i < len; i++ ) {
            msg = outgoing[i];
            xform(messageOperations(msg), ops, function (aPrime, bPrime) {
                messageOperations(msg, aPrime);
                messageDocument(msg, apply(messageDocument(msg), aPrime));
                messageRevision(msg, messageRevision(msg)+1);
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
        var previousDoc = messageDocument(initialData),
            previousRevision = messageRevision(initialData),
            id = messageId(initialData);

        ui.update(previousDoc);

        function loop () {
            var msg, uiDoc = ui.getDocument();
            if ( uiDoc !== previousDoc ) {
                msg = {};
                messageOperations(msg, operations.getOperations(previousDoc, uiDoc));
                messageDocument(msg, uiDoc);
                messageRevision(msg, ++previousRevision);
                messageId(msg, id);

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
                        xformEach(outgoing, messageOperations(msg));
                        ui.update(messageDocument(outgoing[outgoing.length-1]));
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