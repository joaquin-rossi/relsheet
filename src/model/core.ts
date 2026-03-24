import {arrayIsSub} from "../utils/functional-utils.ts";
import type {Scope} from "../utils/language-utils.ts";

export type RelationVal = {
    cols: string[];
    rows: string[][];
};

export type RelationScope = Scope<RelationExpr>;

export type EvalCtx = Readonly<{
    scope: RelationScope,
    callStack: RelationExpr[],
}>;

export abstract class RelationExpr {
    readonly id: string = crypto.randomUUID();

    abstract run(ctx: EvalCtx): RelationVal;
}

export function buildColMap(cols: string[], keys: string[]): number[] {
    if (!arrayIsSub(keys, cols)) {
        throw new Error("Unexpected column");
    }

    return keys.map(c => cols.indexOf(c));
}
