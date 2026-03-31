import {type QueryToken} from "./query-lexer.ts";
import {Parser} from "../../utils/language-utils.ts";

export type QueryParser = Parser<QueryToken>;

export type QueryRelExpr =
    | { type: "VARIABLE"; value: string }
    // identifier
    | QueryRelBinopExpr
    // rel_expr binop rel_expr
    | { type: "PROJECT"; cols: string[]; expr: QueryRelExpr }
    // "project" "[" <list(identifier, ",")> "]" "(" <expr> ")"
    | { type: "SELECT"; cond: QueryScalarExpr; expr: QueryRelExpr }
    // "select" "[" scalar_expr "]" "(" rel_expr ")"
    | { type: "NATURAL_JOIN"; left: QueryRelExpr; right: QueryRelExpr }
    // "natjoin" "(" rel_expr "," rel_expr ")"
    ;

export type QueryRelBinopExpr = {
    type: "BINOP";
    kind: "UNION" | "INTERSECTION" | "DIFFERENCE" | "CROSS"
    left: QueryRelExpr;
    right: QueryRelExpr;
}

export type QueryScalarExpr =
    | { type: "LITERAL_NUM"; value: number }
    | { type: "VARIABLE"; value: string }
    | { type: "LESS_THAN"; left: QueryScalarExpr, right: QueryScalarExpr }
    ;

type ParseFn<T> = (parser: Parser<QueryToken>) => T;

export function parseQuery(tokens: QueryToken[]) {
    const parser = new Parser(tokens);

    const result = parseQueryRelExpr(parser);

    const t = parser.peek();
    if (t != null) {
        throw new Error(`Unexpected token ${t.type} at end of input`);
    }

    return result;
}

function parseQueryRelExpr(parser: QueryParser): QueryRelExpr {
    function parseBinopLeft(kind: QueryRelBinopExpr["kind"], tokenType: QueryToken["type"]) {
        return (next: ParseFn<QueryRelExpr>) => (parser: QueryParser) => {
            let expr = next(parser);

            while (parser.peek()?.type === tokenType) {
                parser.consume();
                expr = {
                    type: "BINOP",
                    kind,
                    left: expr,
                    right: next(parser),
                };
            }

            return expr;
        };
    }

    function parseIdentifierList(parser: QueryParser): string[] {
        const cols: string[] = [];

        const first = parser.expect("IDENTIFIER");
        cols.push(first.value);

        while (parser.peek()?.type === "COMMA") {
            parser.consume();
            const next = parser.expect("IDENTIFIER");
            cols.push(next.value);
        }

        return cols;
    }

    function parsePrimary(parser: QueryParser): QueryRelExpr {
        const token = parser.peek();
        if (!token) {
            throw new Error("Unexpected end of input");
        }

        if (token.type === "IDENTIFIER") {
            parser.consume();

            if (token.value === "project") {
                parser.expect("BRACKET_LEFT");
                const cols = parseIdentifierList(parser);
                parser.expect("BRACKET_RIGHT");
                parser.expect("PAREN_LEFT");
                const expr = parseQueryRelExpr(parser);
                parser.expect("PAREN_RIGHT");

                return {
                    type: "PROJECT",
                    cols,
                    expr,
                };
            } else if (token.value === "select") {
                parser.expect("BRACKET_LEFT");
                const cond = parseQueryScalarExpr(parser);
                parser.expect("BRACKET_RIGHT");
                parser.expect("PAREN_LEFT");
                const expr = parseQueryRelExpr(parser);
                parser.expect("PAREN_RIGHT");

                return {
                    type: "SELECT",
                    cond,
                    expr,
                };
            } else if (token.value === "natjoin") {
                parser.expect("PAREN_LEFT");
                const left = parseQueryRelExpr(parser);
                parser.expect("COMMA");
                const right = parseQueryRelExpr(parser);
                parser.expect("PAREN_RIGHT");

                return {
                    type: "NATURAL_JOIN",
                    left,
                    right,
                };
            } else {
                return {
                    type: "VARIABLE",
                    value: token.value,
                };
            }
        } else if (token.type === "PAREN_LEFT") {
            parser.consume();
            const expr = parseQueryRelExpr(parser);
            parser.expect("PAREN_RIGHT");
            return expr;
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    const stepCross = parseBinopLeft("CROSS", "STAR")(parsePrimary);
    const stepDifference = parseBinopLeft("DIFFERENCE", "DASH")(stepCross);
    const stepIntersection = parseBinopLeft("INTERSECTION", "AND")(stepDifference)
    const stepUnion = parseBinopLeft("UNION", "PIPE")(stepIntersection);
    return stepUnion(parser);
}

function parseQueryScalarExpr(parser: QueryParser): QueryScalarExpr {
    function parseLessThan(): QueryScalarExpr {
        let expr = parsePrimary();

        while (parser.peek()?.type === "LESS_THAN") {
            parser.consume();
            const right = parsePrimary();
            expr = {
                type: "LESS_THAN",
                left: expr,
                right,
            };
        }

        return expr;
    }

    function parsePrimary(): QueryScalarExpr {
        const token = parser.peek();
        if (!token) {
            throw new Error("Unexpected end of input");
        }

        if (token.type === "IDENTIFIER") {
            parser.consume();

            return {
                type: "VARIABLE",
                value: token.value,
            };
        } else if (token.type === "NUMBER") {
            parser.consume();
            return {
                type: "LITERAL_NUM",
                value: token.value
            };
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    return parseLessThan();
}