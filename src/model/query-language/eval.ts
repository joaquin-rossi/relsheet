import type {QueryExpr} from "./parser.ts";
import {buildColMap, type EvalCtx, type RelationVal} from "../core.ts";
import {
    arrayCat,
    arrayDup,
    arrayEq,
    arrayHasRepeats,
    arrayIntr,
    arrayIsSub, arrayLeftDiff,
    unreachable
} from "../../utils/functional-utils.ts";

export function evalQuery(expr: QueryExpr, ctx: EvalCtx): RelationVal {
    if (expr.type === "VARIABLE") {
        const callee = ctx.scope.get(expr.value);
        if (!callee) {
            throw new Error(`Undefined variable: ${expr.value}`);
        }
        if (ctx.callStack.includes(callee)) {
            throw new Error("Callstack overflow");
        }

        return callee.run(ctx);
    } else if (expr.type === "UNION") {
        const leftVal = evalQuery(expr.left, ctx);
        const rightVal = evalQuery(expr.right, ctx);

        if (!arrayEq(leftVal.cols, rightVal.cols)) {
            throw new Error("Incompatible columns");
        }

        return {
            cols: arrayDup(leftVal.cols),
            rows: arrayCat(leftVal.rows, rightVal.rows),
        };
    } else if (expr.type === "PROJECT") {
        if (arrayHasRepeats(expr.cols)) {
            throw new Error("Repeated columns");
        }

        const val = evalQuery(expr.expr, ctx);
        if (!arrayIsSub(expr.cols, val.cols)) {
            throw new Error("Unexpected column");
        }

        const piCols = buildColMap(val.cols, expr.cols);
        function pi(row: string[]): string[] {
            return piCols.map(i => row[i]);
        }

        return {
            cols: arrayDup(expr.cols),
            rows: val.rows.map(pi),
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