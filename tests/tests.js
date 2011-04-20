var ops = require("../operations");
var xform = require("../xform");
var apply = require("../apply");

var numTests = 0;
var failed = 0;

function test (original, a, b, expected) {
    var operationsA = ops.operation(original, a);
    var operationsB = ops.operation(original, b);
    xform(operationsA, operationsB, function (ap, bp) {
        numTests++;
        try {
            console.log(original + " -< (" + a + ", " + b +") >- "
                        + expected);

            var docA = apply(operationsA, original);
            var finalA = apply(bp, docA);
            console.log("  " + original + " -> " + docA + " -> "
                        + finalA);
            if ( finalA !== expected ) {
                throw new Error(finalA + " !== " + expected);
            }

            var docB = apply(operationsB, original);
            var finalB = apply(ap, docB);
            console.log("  " + original + " -> " + docB + " -> "
                        + finalB);
            if ( finalB !== expected ) {
                throw new Error(finalB + " !== " + expected);
            }
        } catch (e) {
            failed++;
            console.log("  ERROR: " + e.message);
        }
    });
}

test("at", "t", "fat", "ft");
test("nick", "Nick", "nick is cool", "Nick is cool");
test("sudo", "sumo", "suo", "sumo");
test("hello", "Hello", "Hello", "Hello");
test("care", "are", "are", "are");
test("air", "fair", "lair", "flair");

console.log(numTests - failed + " / " + numTests + " tests passed.");
