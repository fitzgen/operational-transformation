// This module defines the `xform` function which is at the heart of OT.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(["./operations"], function (ops) {

    // Pattern match on two operations by looking up their transforming function
    // in the `xformTable`. Each function in the table should take arguments
    // like the following:
    //
    //     xformer(operationA, operationB, indexA, indexB, continuation)
    //
    // and should return the results by calling the continuation
    //
    //     return continuation(aPrime || null, bPrime || null, newIndexA, newIndexB);

    var xformTable = {};

    function join (a, b) {
        return a + "," + b;
    }

    // Define a transformation function for when we are comparing two operations
    // of typeA and typeB.
    function defXformer (typeA, typeB, xformer) {
        xformTable[join(typeA, typeB)] = xformer;
    }

    // Assumptions currently made by all of the xformer functions: that all of
    // the individual operations only deal with one character at a time.

    defXformer("retain", "retain", function (opA, opB, indexA, indexB, k) {
        k(opA, opB, indexA+1, indexB+1);
    });

    defXformer("delete", "delete", function (opA, opB, indexA, indexB, k) {
        if ( ops.val(opA) === ops.val(opB) ) {
            k(null, null, indexA+1, indexB+1);
        } else {
            throw new TypeError("Document state mismatch: delete("
                                + ops.val(opA) + ") !== delete(" + ops.val(opB) + ")");
        }
    });

    defXformer("insert", "insert", function (opA, opB, indexA, indexB, k) {
        if ( ops.val(opA) === ops.val(opB) ) {
            k(ops.retain(1), ops.retain(1), indexA+1, indexB+1);
        } else {
            k(opA, ops.retain(1), indexA+1, indexB);
        }
    });

    defXformer("retain", "delete", function (opA, opB, indexA, indexB, k) {
        k(null, opB, indexA+1, indexB+1);
    });

    defXformer("delete", "retain", function (opA, opB, indexA, indexB, k) {
        k(opA, null, indexA+1, indexB+1);
    });

    defXformer("insert", "retain", function (opA, opB, indexA, indexB, k) {
        k(opA, opB, indexA+1, indexB);
    });

    defXformer("retain", "insert", function (opA, opB, indexA, indexB, k) {
        k(opA, opB, indexA, indexB+1);
    });

    defXformer("insert", "delete", function (opA, opB, indexA, indexB, k) {
        k(opA, ops.retain(1), indexA+1, indexB);
    });

    defXformer("delete", "insert", function (opA, opB, indexA, indexB, k) {
        k(ops.retain(1), opB, indexA, indexB+1);
    });

    return function (operationsA, operationsB, k) {
        var operationsAPrime = [],
            operationsBPrime = [],
            lenA = operationsA.length,
            lenB = operationsB.length,
            indexA = 0,
            indexB = 0,
            opA,
            opB,
            xformer;

        // Continuation for the xformer.
        function kk (aPrime, bPrime, newIndexA, newIndexB) {
            indexA = newIndexA;
            indexB = newIndexB;
            if ( aPrime ) {
                operationsAPrime.push(aPrime);
            }
            if ( bPrime ) {
                operationsBPrime.push(bPrime);
            }
        }

        while ( indexA < lenA && indexB < lenB ) {
            opA = operationsA[indexA];
            opB = operationsB[indexB];
            xformer = xformTable[join(ops.type(opA), ops.type(opB))];
            if ( xformer ) {
                xformer(opA, opB, indexA, indexB, kk);
            } else {
                throw new TypeError("Unknown combination to transform: "
                                    + join(ops.type(opA), ops.type(opB)));
            }
        }

        // If either set of operations was longer than the other, we can just
        // pass them on to the prime version.

        for ( ; indexA < lenA; indexA++ ) {
            operationsAPrime.push(operationsA[indexA]);
            operationsBPrime.push(ops.retain(1));
        }

        for ( ; indexB < lenB; indexB++ ) {
            operationsBPrime.push(operationsB[indexB]);
            operationsAPrime.push(ops.retain(1));
        }

        return k(operationsAPrime, operationsBPrime);
    };

});