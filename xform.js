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

    function defXformer (typeA, typeB, xformer) {
        xformTable[join(typeA, typeB)] = xformer;
    }

    // For now, assume that the length of a retain is *always* 1.
    defXformer("retain", "retain", function (opA, opB, indexA, indexB, k) {
        k(opA, opB, indexA+1, indexB+1);
    });

    // For now, assume that deletes are always a single char at a time.
    defXformer("delete", "delete", function (opA, opB, indexA, indexB, k) {
        if ( ops.val(opA) === ops.val(opB) ) {
            k(null, null, indexA+1, indexB+1);
        } else {
            throw new TypeError("Document state mismatch: delete("
                                + ops.val(opA) + ") !== delete(" + ops.val(opB) + ")");
        }
    });

    // For now, assume inserts are always a single character at a time.
    defXformer("insert", "insert", function (opA, opB, indexA, indexB, k) {
        if ( ops.val(opA) === ops.val(opB) ) {
            k(ops.retain(1), ops.retain(1), indexA+1, indexB+1);
        } else {
            k(ops.retain(1), opA, indexA+1, indexB);
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

        // Continuation for the xformer
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

        for ( ; indexA < lenA; indexA++ ) {
            operationsBPrime.push(operationsA[indexA]);
            operationsAPrime.push(ops.retain(1));
        }

        for ( ; indexB < lenB; indexB++ ) {
            operationsAPrime.push(operationsB[indexB]);
            operationsBPrime.push(ops.retain(1));
        }

        return k(operationsAPrime, operationsBPrime);
    };

});