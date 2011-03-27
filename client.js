// This modules defines the behavior of the client's OT. It handles the
// buffering of operations yet to be committed to the master document and the
// responsibility of transforming those operations if the server sends new
// operations before they have all been committed.
//
// While this code is meant to run on the client, it does not contain any DOM
// manipulation, or browser specific code. All of that is abstracted and
// sandboxed within the `ui` option for the `OTDocument` constructor. One could
// fairly easily use some front end other than the browser with little to no
// changes so long as they provide the functions required in the ui parameter.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define, setTimeout */

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
                id: docId
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

    // Might need to start sending client id's back and forth. Don't really want
    // to have to do a deep equality test on every check here.
    function isOurOutgoing (msg, outgoing) {
        var top = outgoing[0],
            topOps = messages.operations(top),
            msgOps = messages.operations(msg),
            i = 0,
            len = msgOps.length;
        if ( messages.id(msg) !== messages.id(top) ) {
            return false;
        }
        if ( messages.rev(msg) !== messages.rev(top) ) {
            return false;
        }
        if ( len !== topOps.length ) {
            return false;
        }
        if ( topOps.join() !== msgOps.join() ) {
            return false;
        }
        return true;
    }

    return {
        OTDocument: function (opts) {
            var outgoing = [],
                socket = opts.socket || error("socket is required"),
                ui = opts.socket || error("ui is required"),
                docId = opts.id,
                initialized = false;

            connect(socket, docId);

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