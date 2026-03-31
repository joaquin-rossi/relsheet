import {type EvalCtx, RelationExpr, type RelationVal} from "./core.ts";
import {arrayAppend} from "../utils/functional-utils.ts";
import {parseQuery} from "./query-language/query-parser.ts";
import {evalQuery} from "./query-language/query-eval.ts";
import {tokenizeQuery} from "./query-language/query-lexer.ts";

export class QueryRelationExpr extends RelationExpr {
    query: string = "";

    override run(ctx: EvalCtx): RelationVal {
        const tokens = tokenizeQuery(this.query);
        const expr = parseQuery(tokens);
        return evalQuery(expr, {
            ...ctx,
            callStack: arrayAppend(ctx.callStack, this),
        });
    }
}