import type {QueryRelExpr, QueryScalarExpr} from "./query-parser.ts";
import {buildColMap, type EvalCtx, type RelationVal, type ScalarScope, type ScalarVal} from "../core.ts";
import {
    arrayCat,
    arrayDup,
    arrayEq,
    arrayHasRepeats,
    arrayIntr,
    arrayLeftDiff,
    unreachable
} from "../../utils/functional-utils.ts";
import {GlobalScope} from "../../utils/language-utils.ts";

export function evalQuery(expr: QueryRelExpr, ctx: EvalCtx): RelationVal {
    if (expr.type === "VARIABLE") {
        const callee = ctx.scope.get(expr.value);
        if (!callee) {
            throw new Error(`Undefined variable: ${expr.value}`);
        }
        if (ctx.callStack.includes(callee)) {
            throw new Error("Callstack overflow");
        }

        return callee.run(ctx);
    } else if (expr.type === "BINOP") {
        const leftVal = evalQuery(expr.left, ctx);
        const rightVal = evalQuery(expr.right, ctx);

        if (expr.kind === "UNION") {
            if (!arrayEq(leftVal.cols, rightVal.cols)) {
                throw new Error("Incompatible columns");
            }

            return {
                cols: arrayDup(leftVal.cols),
                rows: arrayCat(leftVal.rows, rightVal.rows),
            };
        } else if (expr.kind === "INTERSECTION") {
            if (!arrayEq(leftVal.cols, rightVal.cols)) {
                throw new Error("Incompatible columns");
            }

            return {
                cols: arrayDup(leftVal.cols),
                rows: leftVal.rows.filter(l => rightVal.rows.some(r => arrayEq(l, r))),
            };
        } else if (expr.kind === "DIFFERENCE") {
            if (!arrayEq(leftVal.cols, rightVal.cols)) {
                throw new Error("Incompatible columns");
            }

            return {
                cols: arrayDup(leftVal.cols),
                rows: leftVal.rows.filter(l => !rightVal.rows.some(r => arrayEq(l, r))),
            };
        } else if (expr.kind === "CROSS") {
            const colsJoin = arrayIntr(leftVal.cols, rightVal.cols);

            const leftCols = leftVal.cols.map(c =>
                colsJoin.includes(c) ? `${c}_left` : c
            );
            const rightCols = rightVal.cols.map(c =>
                colsJoin.includes(c) ? `${c}_right` : c
            );

            const mapLeft = buildColMap(leftVal.cols, leftVal.cols);
            const mapRight = buildColMap(rightVal.cols, rightVal.cols);

            return {
                cols: arrayCat(leftCols, rightCols),
                rows: leftVal.rows.flatMap(l =>
                    rightVal.rows.map(r => arrayCat(
                        mapLeft.map(i => l[i]),
                        mapRight.map(i => r[i]),
                    ))
                )
            };
        } else {
            return unreachable((expr as any).kind);
        }
    } else if (expr.type === "PROJECT") {
        const exprColDefs = expr.cols;
        const exprCols = expr.cols.map(x => x.name);

        if (arrayHasRepeats(exprCols)) {
            throw new Error("Repeated columns");
        }

        const val = evalQuery(expr.expr, ctx);

        function pi(row: string[]): string[] {
            const scope = new GlobalScope<string>();
            val.cols.forEach((c, i) => {
                scope.define(c, row[i]);
            });

            return exprColDefs.map(c =>
                evalQueryScalar(c.expr, scope)
            );
        }

        return {
            cols: exprCols,
            rows: val.rows.map(pi),
        };
    } else if (expr.type === "SELECT") {
        const val = evalQuery(expr.expr, ctx);

        const rows = val.rows
            .filter(row => {
                const scope = new GlobalScope<string>();
                val.cols.forEach((c, i) => {
                    scope.define(c, row[i]);
                });

                return evalQueryScalar(expr.cond, scope) === "true";
            });

        return {
            cols: val.cols,
            rows,
        };
    } else if (expr.type === "NATURAL_JOIN") {
        const leftVal = evalQuery(expr.left, ctx);
        const rightVal = evalQuery(expr.right, ctx);

        const colsJoin = arrayIntr(leftVal.cols, rightVal.cols);
        const colsLeft = arrayLeftDiff(leftVal.cols, colsJoin);
        const colsRight = arrayLeftDiff(rightVal.cols, colsJoin);

        const mapJoinLeft = buildColMap(leftVal.cols, colsJoin);
        const mapJoinRight = buildColMap(rightVal.cols, colsJoin);
        const mapLeft = buildColMap(leftVal.cols, colsLeft);
        const mapRight = buildColMap(rightVal.cols, colsRight);

        return {
            cols: arrayCat(colsJoin, arrayCat(colsLeft, colsRight)),
            rows: leftVal.rows.flatMap(l =>
                rightVal.rows
                    .filter(r => colsJoin.every((_c, i) =>
                        l[mapJoinLeft[i]] === r[mapJoinRight[i]]
                    ))
                    .map(r => arrayCat(
                        mapJoinLeft.map(i => l[i]),
                        arrayCat(
                            mapLeft.map(i => l[i]),
                            mapRight.map(i => r[i]),
                        )
                    ))
            )
        };
    } else {
        return unreachable((expr as any).type);
    }
}

function evalQueryScalar(expr: QueryScalarExpr, scope: ScalarScope): ScalarVal {
    if (expr.type === "VARIABLE") {
        const val = scope.get(expr.value);
        if (!val) {
            throw new Error(`Undefined scalar variable: ${expr.value}`);
        } else {
            return val;
        }
    } else if (expr.type === "NUMBER") {
        return expr.value.toString();
    } else if (expr.type === "BINOP") {
        const leftVal = evalQueryScalar(expr.left, scope);
        const rightVal = evalQueryScalar(expr.right, scope);

        if (expr.kind === "LT") {
            return parseFloat(leftVal) < parseFloat(rightVal) ? "true" : "false";
        } else if (expr.kind === "LTE") {
            return parseFloat(leftVal) <= parseFloat(rightVal) ? "true" : "false";
        } else if (expr.kind === "GT") {
            return parseFloat(leftVal) > parseFloat(rightVal) ? "true" : "false";
        } else if (expr.kind === "GTE") {
            return parseFloat(leftVal) >= parseFloat(rightVal) ? "true" : "false";
        } else if (expr.kind === "ADD") {
            return (parseFloat(leftVal) + parseFloat(rightVal)).toString();
        } else if (expr.kind === "SUB") {
            return (parseFloat(leftVal) - parseFloat(rightVal)).toString();
        } else if (expr.kind === "MUL") {
            return (parseFloat(leftVal) * parseFloat(rightVal)).toString();
        } else if (expr.kind === "DIV") {
            return (parseFloat(leftVal) / parseFloat(rightVal)).toString();
        } else {
            return unreachable((expr as any).kind);
        }
    } else {
        return unreachable((expr as any).type);
    }
}