// This module defines the `xform` function which is at the heart of OT.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(["./operations"], function (ops) {

    // Pattern match on two changes by looking up their transforming function in
    // the `xformTable`. Each function in the table should take arguments like
    // the following:
    //
    //     xformer(changeA, changeB, indexA, indexB, continuation)
    //
    // and should return the results by calling the continuation
    //
    //     return continuation(changeAPrime || null, changeBPrime || null, newIndexA, newIndexB);

    var xformTable = {};

    function join (a, b) {
        return a + "," + b;
    }

    // Define a transformation function for when we are comparing two changes of
    // typeA and typeB.
    function defXformer (typeA, typeB, xformer) {
        xformTable[join(typeA, typeB)] = xformer;
    }

    // Assumptions currently made by all of the xformer functions: that all of
    // the individual changes only deal with one character at a time.

    defXformer("retain", "retain", function (changeA, changeB, indexA, indexB, k) {
        k(changeA, changeB, indexA+1, indexB+1);
    });

    defXformer("delete", "delete", function (changeA, changeB, indexA, indexB, k) {
        if ( ops.val(changeA) === ops.val(changeB) ) {
            k(null, null, indexA+1, indexB+1);
        } else {
            throw new TypeError("Document state mismatch: delete("
                                + ops.val(changeA) + ") !== delete(" + ops.val(changeB) + ")");
        }
    });

    defXformer("insert", "insert", function (changeA, changeB, indexA, indexB, k) {
        if ( ops.val(changeA) === ops.val(changeB) ) {
            k(ops.retain(1), ops.retain(1), indexA+1, indexB+1);
        } else {
            k(changeA, ops.retain(1), indexA+1, indexB);
        }
    });

    defXformer("retain", "delete", function (changeA, changeB, indexA, indexB, k) {
        k(null, changeB, indexA+1, indexB+1);
    });

    defXformer("delete", "retain", function (changeA, changeB, indexA, indexB, k) {
        k(changeA, null, indexA+1, indexB+1);
    });

    defXformer("insert", "retain", function (changeA, changeB, indexA, indexB, k) {
        k(changeA, changeB, indexA+1, indexB);
    });

    defXformer("retain", "insert", function (changeA, changeB, indexA, indexB, k) {
        k(changeA, changeB, indexA, indexB+1);
    });

    defXformer("insert", "delete", function (changeA, changeB, indexA, indexB, k) {
        k(changeA, ops.retain(1), indexA+1, indexB);
    });

    defXformer("delete", "insert", function (changeA, changeB, indexA, indexB, k) {
        k(ops.retain(1), changeB, indexA, indexB+1);
    });

    return function (operationA, operationB, k) {
        var operationAPrime = [],
            operationBPrime = [],
            lenA = operationA.length,
            lenB = operationB.length,
            indexA = 0,
            indexB = 0,
            changeA,
            changeB,
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
            changeA = operationA[indexA];
            changeB = operationB[indexB];
            xformer = xformTable[join(ops.type(changeA), ops.type(changeB))];
            if ( xformer ) {
                xformer(changeA, changeB, indexA, indexB, kk);
            } else {
                throw new TypeError("Unknown combination to transform: "
                                    + join(ops.type(changeA), ops.type(changeB)));
            }
        }

        // If either operation contains more changes than the other, we just
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