// This module defines the implementation of our operations. How they are
// represented, their construction, and how to calculate the set of operations
// to change some document A in to document B.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(function () {

    // Simple operation constructors.

    function insert (chars) {
        return ["insert", chars];
    }

    function del (chars) {
        return ["delete", chars];
    }

    function retain (n) {
        return ["retain", n];
    }

    function type (operation) {
        return operation[0];
    }

    function val (operation) {
        return operation[1];
    }

    // We don't want to copy arrays all the time, aren't mutating lists, and
    // only need O(1) prepend and length, we can get away with a custom singly
    // linked list implementation.

    var theEmptyList = {
        length: 0,
        toArray: function () {
            return [];
        }
    };

    function toArray () {
        var node = this,
            ary = [];
        while ( node !== theEmptyList ) {
            ary.push(node.car);
            node = node.cdr;
        }
        return ary;
    }

    function cons (car, cdr) {
        return {
            car: car,
            cdr: cdr,
            length: 1 + cdr.length,
            toArray: toArray
        };
    }

    // Abstract out the table in case I want to change the implementation to
    // arrays of arrays or something.

    function put (table, x, y, ops) {
        return (table[String(x) + "," + String(y)] = ops);
    }

    function get (table, x, y) {
        var ops = table[String(x) + "," + String(y)];
        if ( ops ) {
            return ops;
        } else {
            throw new TypeError("No operations at " + String(x) + "," + String(y));
        }
    }

    function makeOperationsTable (s, t) {
        var table = {},
            n = s.length,
            m = t.length,
            i,
            j;
        put(table, 0, 0, theEmptyList);
        for ( i = 1; i <= m; i += 1 ) {
            put(table, i, 0, cons(insert(t.charAt(i-1)),
                                  get(table, i-1, 0)));
        }
        for ( j = 1; j <= n; j += 1 ) {
            put(table, 0, j, cons(del(s.charAt(j-1)),
                                  get(table, 0, j-1)));
        }
        return table;
    }

    function chooseCell (table, x, y, k) {
        var prevOps = get(table, x, y-1),
            min = prevOps.length,
            direction = "up";

        if ( get(table, x-1, y).length < min ) {
            prevOps = get(table, x-1, y);
            min = prevOps.length;
            direction = "left";
        }

        if ( get(table, x-1, y-1).length < min ) {
            prevOps = get(table, x-1, y-1);
            min = prevOps.length;
            direction = "diagonal";
        }

        return k(direction, prevOps);
    }

    return {

        getOperations: function (s, t) {
            var n = s.length,
                m = t.length,
                i,
                j,
                ops = makeOperationsTable(s, t);
            for ( i = 1; i <= m; i += 1 ) {
                for ( j = 1; j <= n; j += 1 ) {
                    chooseCell(ops, i, j, function (direction, prevOps) {
                        switch ( direction ) {
                        case "left":
                            put(ops, i, j, cons(insert(t.charAt(i-1)), prevOps));
                            break;
                        case "up":
                            put(ops, i, j, cons(del(s.charAt(j-1)), prevOps));
                            break;
                        case "diagonal":
                            if ( s.charAt(j-1) === t.charAt(i-1) ) {
                                put(ops, i, j, cons(retain(1), prevOps));
                            } else {
                                put(ops, i, j, cons(insert(t.charAt(i-1)),
                                                    cons(del(s.charAt(j-1)),
                                                         prevOps)));
                            }
                            break;
                        default:
                            throw new TypeError("Unknown direction.");
                        }
                    });
                }
            }
            return get(ops, i-1, j-1).toArray().reverse();
        },

        insert: insert,
        del: del,
        retain: retain,
        type: type,
        val: val,

        isDelete: function (op) {
            return typeof op === "object" && type(op) === "delete";
        },

        isRetain: function (op) {
            return typeof op === "object" && type(op) === "retain";
        },

        isInsert: function (op) {
            return typeof op === "object" && type(op) === "insert";
        }

    };

});
