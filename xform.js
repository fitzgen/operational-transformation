// This module defines the `xform` function which is at the heart of OT.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(["./operations"], function (ops) {

    // Pattern match on two edits by looking up their transforming function in
    // the `xformTable`. Each function in the table should take arguments like
    // the following:
    //
    //     xformer(editA, editB, indexA, indexB, continuation)
    //
    // and should return the results by calling the continuation
    //
    //     return continuation(editAPrime || null, editBPrime || null, newIndexA, newIndexB);

    var xformTable = {};

    function join (a, b) {
        return a + "," + b;
    }

    // Define a transformation function for when we are comparing two edits of
    // typeA and typeB.
    function defXformer (typeA, typeB, xformer) {
        xformTable[join(typeA, typeB)] = xformer;
    }

    // Assumptions currently made by all of the xformer functions: that all of
    // the individual edits only deal with one character at a time.

    defXformer("retain", "retain", function (editA, editB, indexA, indexB, k) {
        k(editA, editB, indexA+1, indexB+1);
    });

    defXformer("delete", "delete", function (editA, editB, indexA, indexB, k) {
        if ( ops.val(editA) === ops.val(editB) ) {
            k(null, null, indexA+1, indexB+1);
        } else {
            throw new TypeError("Document state mismatch: delete("
                                + ops.val(editA) + ") !== delete(" + ops.val(editB) + ")");
        }
    });

    defXformer("insert", "insert", function (editA, editB, indexA, indexB, k) {
        if ( ops.val(editA) === ops.val(editB) ) {
            k(ops.retain(1), ops.retain(1), indexA+1, indexB+1);
        } else {
            k(editA, ops.retain(1), indexA+1, indexB);
        }
    });

    defXformer("retain", "delete", function (editA, editB, indexA, indexB, k) {
        k(null, editB, indexA+1, indexB+1);
    });

    defXformer("delete", "retain", function (editA, editB, indexA, indexB, k) {
        k(editA, null, indexA+1, indexB+1);
    });

    defXformer("insert", "retain", function (editA, editB, indexA, indexB, k) {
        k(editA, editB, indexA+1, indexB);
    });

    defXformer("retain", "insert", function (editA, editB, indexA, indexB, k) {
        k(editA, editB, indexA, indexB+1);
    });

    defXformer("insert", "delete", function (editA, editB, indexA, indexB, k) {
        k(editA, ops.retain(1), indexA+1, indexB);
    });

    defXformer("delete", "insert", function (editA, editB, indexA, indexB, k) {
        k(ops.retain(1), editB, indexA, indexB+1);
    });

    return function (operationA, operationB, k) {
        var operationAPrime = [],
            operationBPrime = [],
            lenA = operationA.length,
            lenB = operationB.length,
            indexA = 0,
            indexB = 0,
            editA,
            editB,
            xformer;

        // Continuation for the xformer.
        function kk (aPrime, bPrime, newIndexA, newIndexB) {
            indexA = newIndexA;
            indexB = newIndexB;
            if ( aPrime ) {
                operationAPrime.push(aPrime);
            }
            if ( bPrime ) {
                operationBPrime.push(bPrime);
            }
        }

        while ( indexA < lenA && indexB < lenB ) {
            editA = operationA[indexA];
            editB = operationB[indexB];
            xformer = xformTable[join(ops.type(editA), ops.type(editB))];
            if ( xformer ) {
                xformer(editA, editB, indexA, indexB, kk);
            } else {
                throw new TypeError("Unknown combination to transform: "
                                    + join(ops.type(editA), ops.type(editB)));
            }
        }

        // If either operation contains more edits than the other, we just
        // pass them on to the prime version.

        for ( ; indexA < lenA; indexA++ ) {
            operationAPrime.push(operationA[indexA]);
            operationBPrime.push(ops.retain(1));
        }

        for ( ; indexB < lenB; indexB++ ) {
            operationBPrime.push(operationB[indexB]);
            operationAPrime.push(ops.retain(1));
        }

        return k(operationAPrime, operationBPrime);
    };

});