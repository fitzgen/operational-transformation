// Operations are a stream of individual changes which span the whole document
// from start to finish. Changes have a type which is one of retain, insert, or
// delete, and have associated data based on their type.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(function () {

    // Simple change constructors.

    function insert (chars) {
        return "i" + chars;
    }

    function del (chars) {
        return "d" + chars;
    }

    function retain (n) {
        return "r" + String(n);
    }

    function type (change) {
        switch ( change.charAt(0) ) {
        case "r":
            return "retain";
        case "d":
            return "delete";
        case "i":
            return "insert";
        default:
            throw new TypeError("Unknown type of change: ", change);
        }
    }

    function val (change) {
        return type(change) === "r"
            ? Number(change.slice(1))
            : change.slice(1);
    }

    // We don't want to copy arrays all the time, aren't mutating lists, and
    // only need O(1) prepend and length, we can get away with a custom singly
    // linked list implementation.

    // TODO: keep track of number of non-retain changes and use this instead of
    // length when choosing which path to take.

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

    function put (table, x, y, changes) {
        return (table[String(x) + "," + String(y)] = changes);
    }

    function get (table, x, y) {
        var changes = table[String(x) + "," + String(y)];
        if ( changes ) {
            return changes;
        } else {
            throw new TypeError("No operations at " + String(x) + "," + String(y));
        }
    }

    function makeChangesTable (s, t) {
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
        var prevChanges = get(table, x, y-1),
            min = prevChanges.length,
            direction = "up";

        if ( get(table, x-1, y).length < min ) {
            prevChanges = get(table, x-1, y);
            min = prevChanges.length;
            direction = "left";
        }

        if ( get(table, x-1, y-1).length < min ) {
            prevChanges = get(table, x-1, y-1);
            min = prevChanges.length;
            direction = "diagonal";
        }

        return k(direction, prevChanges);
    }

    return {

        // Constructor for operations (which are a stream of changes). Uses
        // variation of Levenshtein Distance.
        operation: function (s, t) {
            var n = s.length,
                m = t.length,
                i,
                j,
                changes = makeChangesTable(s, t);

            for ( i = 1; i <= m; i += 1 ) {
                for ( j = 1; j <= n; j += 1 ) {
                    chooseCell(changes, i, j, function (direction, prevChanges) {
                        switch ( direction ) {
                        case "left":
                            put(changes, i, j, cons(insert(t.charAt(i-1)), prevChanges));
                            break;
                        case "up":
                            put(changes, i, j, cons(del(s.charAt(j-1)), prevChanges));
                            break;
                        case "diagonal":
                            if ( s.charAt(j-1) === t.charAt(i-1) ) {
                                put(changes, i, j, cons(retain(1), prevChanges));
                            } else {
                                put(changes, i, j, cons(insert(t.charAt(i-1)),
                                                        cons(del(s.charAt(j-1)),
                                                             prevChanges)));
                            }
                            break;
                        default:
                            throw new TypeError("Unknown direction.");
                        }
                    });
                }
            }

            return get(changes, m, n).toArray().reverse();
        },

        insert: insert,
        del: del,
        retain: retain,
        type: type,
        val: val,

        isDelete: function (change) {
            return typeof change === "object" && type(change) === "delete";
        },

        isRetain: function (change) {
            return typeof change === "object" && type(change) === "retain";
        },

        isInsert: function (change) {
            return typeof change === "object" && type(change) === "insert";
        }

    };

});
