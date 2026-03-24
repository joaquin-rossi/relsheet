import {type EvalCtx, RelationExpr, type RelationVal} from "./core.ts";
import {arrayAppend} from "../utils/functional-utils.ts";
import {parseQuery} from "./query-language/parser.ts";
import {evalQuery} from "./query-language/eval.ts";

export class FormulaRelationExpr extends RelationExpr {
    query: string = "";

    override run(ctx: EvalCtx): RelationVal {
        const expr = parseQuery(this.query);
        return evalQuery(expr, {
            ...ctx,
            callStack: arrayAppend(ctx.callStack, this),
        });
    }
}