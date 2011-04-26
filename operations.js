// Operations are a stream of individual edits which span the whole document
// from start to finish. Edits have a type which is one of retain, insert, or
// delete, and have associated data based on their type.


/*jslint onevar: true, undef: true, eqeqeq: true, bitwise: true,
  newcap: true, immed: true, nomen: false, white: false, plusplus: false,
  laxbreak: true */

/*global define */

define(function () {

    // Simple edit constructors.

    function insert (chars) {
        return "i" + chars;
    }

    function del (chars) {
        return "d" + chars;
    }

    function retain (n) {
        return "r" + String(n);
    }

    function type (edit) {
        switch ( edit.charAt(0) ) {
        case "r":
            return "retain";
        case "d":
            return "delete";
        case "i":
            return "insert";
        default:
            throw new TypeError("Unknown type of edit: ", edit);
        }
    }

    function val (edit) {
        return type(edit) === "r"
            ? Number(edit.slice(1))
            : edit.slice(1);
    }

    // We don't want to copy arrays all the time, aren't mutating lists, and
    // only need O(1) prepend and length, we can get away with a custom singly
    // linked list implementation.

    // TODO: keep track of number of non-retain edits and use this instead of
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

    // Abstract out the table in case I want to edit the implementation to
    // arrays of arrays or something.

    function put (table, x, y, edits) {
        return (table[String(x) + "," + String(y)] = edits);
    }

    function get (table, x, y) {
        var edits = table[String(x) + "," + String(y)];
        if ( edits ) {
            return edits;
        } else {
            throw new TypeError("No operation at " + String(x) + "," + String(y));
        }
    }

    function makeEditsTable (s, t) {
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
        var prevEdits = get(table, x, y-1),
            min = prevEdits.length,
            direction = "up";

        if ( get(table, x-1, y).length < min ) {
            prevEdits = get(table, x-1, y);
            min = prevEdits.length;
            direction = "left";
        }

        if ( get(table, x-1, y-1).length < min ) {
            prevEdits = get(table, x-1, y-1);
            min = prevEdits.length;
            direction = "diagonal";
        }

        return k(direction, prevEdits);
    }

    return {

        // Constructor for operations (which are a stream of edits). Uses
        // variation of Levenshtein Distance.
        operation: function (s, t) {
            var n = s.length,
                m = t.length,
                i,
                j,
                edits = makeEditsTable(s, t);

            for ( i = 1; i <= m; i += 1 ) {
                for ( j = 1; j <= n; j += 1 ) {
                    chooseCell(edits, i, j, function (direction, prevEdits) {
                        switch ( direction ) {
                        case "left":
                            put(edits, i, j, cons(insert(t.charAt(i-1)), prevEdits));
                            break;
                        case "up":
                            put(edits, i, j, cons(del(s.charAt(j-1)), prevEdits));
                            break;
                        case "diagonal":
                            if ( s.charAt(j-1) === t.charAt(i-1) ) {
                                put(edits, i, j, cons(retain(1), prevEdits));
                            } else {
                                put(edits, i, j, cons(insert(t.charAt(i-1)),
                                                        cons(del(s.charAt(j-1)),
                                                             prevEdits)));
                            }
                            break;
                        default:
                            throw new TypeError("Unknown direction.");
                        }
                    });
                }
            }

            return get(edits, m, n).toArray().reverse();
        },

        insert: insert,
        del: del,
        retain: retain,
        type: type,
        val: val,

        isDelete: function (edit) {
            return typeof edit === "object" && type(edit) === "delete";
        },

        isRetain: function (edit) {
            return typeof edit === "object" && type(edit) === "retain";
        },

        isInsert: function (edit) {
            return typeof edit === "object" && type(edit) === "insert";
        }

    };

});
