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
            xform(messages.operation(msg), ops, function (aPrime, bPrime) {
                messages.operation(msg, aPrime);
                messages.document(msg, aPrime, apply(aPrime, messages.document(msg)));
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

    // Might need to start sending client id's back and forth. Don't really want
    // to have to do a deep equality test on every check here.
    function isOurOutgoing (msg, outgoing) {
        var top = outgoing[0],
            topOps = messages.operation(top),
            msgOps = messages.operation(msg),
            i = 0,
            len = msgOps.length;
        if ( messages.id(msg) !== messages.id(top) ) {
            return false;
        }
        if ( messages.revision(msg) !== messages.revision(top) ) {
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

    function updateSelection (selection, operation) {
        var i = 0,
            len = operation.length,
            newSelection = {
                start: selection.start,
                end: selection.end
            },
            size;
        for ( i = 0; i < len; i++ ) {
            if ( operations.isDelete(operation[i]) ) {
                size = operations.val(operation[i]).length;
                newSelection.start -= size;
                newSelection.end -= size;
            } else if ( operations.isInsert(operation[i]) ) {
                size = operations.val(operation[i]).length;
                newSelection.start += size;
                newSelection.end += size;
            }
        }
        return newSelection;
    }

    function init (outgoing, incoming, socket, ui, initialData) {
        var previousDoc = messages.document(initialData),
            previousRevision = messages.revision(initialData),
            id = messages.id(initialData);

        ui.update(previousDoc);

        function loop () {
            var msg,
                newSelection,
                oldOutgoingLength = outgoing.length,
                uiDoc = ui.getDocument();

            if ( uiDoc !== previousDoc ) {
                msg = {};
                messages.operation(msg, operations.operation(previousDoc, uiDoc));
                messages.document(msg, uiDoc);
                messages.revision(msg, ++previousRevision);
                messages.id(msg, id);

                outgoing.push(msg);
                previousDoc = uiDoc;
            }

            while ( (msg = incoming.shift()) ) {
                if ( outgoing.length && isOurOutgoing(msg, outgoing) ) {
                    outgoing.shift();
                } else {
                    xformEach(outgoing, messages.operation(msg));
                    previousRevision++;

                    newSelection = updateSelection(ui.getSelection(),
                                                   messages.operation(msg));

                    if ( outgoing.length ) {
                        previousDoc = messages.document(outgoing[outgoing.length-1]);
                        ui.update(previousDoc, newSelection);
                    } else {
                        previousDoc = messages.document(msg);
                        ui.update(previousDoc, newSelection);
                    }
                }
            }

            if ( outgoing.length ) {
                socket.send({
                    type: "update",
                    data: outgoing[0]
                });
            }

            setTimeout(loop, 1000);
        }

        setTimeout(loop, 10);
    }

    function noop () {}

    return {
        OTDocument: function (opts) {
            var outgoing = [],
                incoming = [],
                socket = opts.socket || error("socket is required"),
                ui = opts.ui || error("ui is required"),
                pubsub = opts.pubsub || { publish: noop, subscribe: noop },
                docId = opts.id,
                initialized = false;

            connect(socket, docId);

            socket.onMessage(function (event) {
                switch ( event.type ) {

                case "connect":
                    if ( ! initialized ) {
                        init(outgoing, incoming, socket, ui, event.data);
                        pubsub.publish("/ot/connect", [event.data]);
                        initialized = true;
                    } else {
                        pubsub.publish("/ot/error", ["Already initialized"]);
                        throw new Error("Already initialized");
                    }
                    break;

                case "update":
                    incoming.push(event.data);
                    pubsub.publish("/ot/update", [event.data]);
                    break;

                default:
                    pubsub.publish("/ot/error", ["Unknown event type", event.type]);
                    throw new Error("Unknown event type: " + event.type);

                }
            });
        }
    };

});