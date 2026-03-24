import {tokenizeQuery} from "./lexer.ts";
import {Parser} from "../../utils/language-utils.ts";

export type QueryExpr =
    | { type: "VARIABLE"; value: string }
    // identifier
    | { type: "UNION"; left: QueryExpr; right: QueryExpr }
    // <expr> pipe <expr>
    | { type: "PROJECT"; cols: string[]; expr: QueryExpr }
    // <project> [ <list(identifier, comma)> ] ( <expr> )
    | { type: "NATURAL_JOIN"; left: QueryExpr; right: QueryExpr }
    // <expr> star <expr>
    ;

export function parseQuery(query: string): QueryExpr {
    const tokens = tokenizeQuery(query);
    const parser = new Parser(tokens);

    // left-associative
    function parseUnion(): QueryExpr {
        let expr = parseNaturalJoin();

        while (parser.peek()?.type === "PIPE") {
            parser.consume();
            const right = parseNaturalJoin();
            expr = {
                type: "UNION",
                left: expr,
                right,
            };
        }

        return expr;
    }

    // left-associative
    function parseNaturalJoin(): QueryExpr {
        let expr = parsePrimary();

        while (parser.peek()?.type === "STAR") {
            parser.consume();
            const right = parsePrimary();
            expr = {
                type: "NATURAL_JOIN",
                left: expr,
                right,
            };
        }

        return expr;
    }


    function parseIdentifierList(): string[] {
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

    function parsePrimary(): QueryExpr {
        const token = parser.peek();
        if (!token) {
            throw new Error("Unexpected end of input");
        }

        if (token.type === "IDENTIFIER") {
            parser.consume();

            // project[cols](expr)
            if (token.value === "project") {
                parser.expect("BRACKET_LEFT");
                const cols = parseIdentifierList();
                parser.expect("BRACKET_RIGHT");
                parser.expect("PAREN_LEFT");
                const expr = parseUnion();
                parser.expect("PAREN_RIGHT");

                return {
                    type: "PROJECT",
                    cols,
                    expr,
                };
            }

            return {
                type: "VARIABLE",
                value: token.value,
            };
        } else if (token.type === "PAREN_LEFT") {
            parser.consume();
            const expr = parseUnion();
            parser.expect("PAREN_RIGHT");
            return expr;
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    const result = parseUnion();

    const t = parser.peek();
    if (t != null) {
        throw new Error(`Unexpected token ${t.type} at end of input`);
    }

    return result;
}