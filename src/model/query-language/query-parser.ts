import {type QueryToken} from "./query-lexer.ts";
import {Parser} from "../../utils/language-utils.ts";

export type QueryParser = Parser<QueryToken>;

export type QueryRelExpr =
    | { type: "VARIABLE"; value: string }
    // identifier
    | QueryRelBinopExpr
    // rel_expr binop rel_expr
    | { type: "PROJECT"; cols: QueryProjectCol[]; expr: QueryRelExpr }
    // "project" "[" <list(project_clause, ",")> "]" "(" rel_expr ")"
    | { type: "SELECT"; cond: QueryScalarExpr; expr: QueryRelExpr }
    // "select" "[" scalar_expr "]" "(" rel_expr ")"
    | { type: "NATURAL_JOIN"; left: QueryRelExpr; right: QueryRelExpr }
    // "natjoin" "(" rel_expr "," rel_expr ")"
    ;

// name "=>" scalar_expr
export type QueryProjectCol = { name: string, expr: QueryScalarExpr };

export type QueryRelBinopExpr = {
    type: "BINOP";
    kind: "UNION" | "INTERSECTION" | "DIFFERENCE" | "CROSS"
    left: QueryRelExpr;
    right: QueryRelExpr;
}

export type QueryScalarExpr =
    | { type: "NUMBER"; value: number }
    | { type: "VARIABLE"; value: string }
    | QueryScalarBinopExpr
    ;

export type QueryScalarBinopExpr = {
    type: "BINOP";
    kind: "LT" | "LTE" | "GT" | "GTE" | "ADD" | "SUB" | "MUL" | "DIV";
    left: QueryScalarExpr;
    right: QueryScalarExpr;
}

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

    function parseList<T>(itemParser: ParseFn<T>, itemSep: QueryToken["type"]) {
        return (parser: QueryParser): T[] => {
            const items: T[] = [];

            items.push(itemParser(parser));
            while (parser.peek()?.type === itemSep) {
                parser.consume();
                items.push(itemParser(parser));
            }

            return items;
        };
    }

    function parseProjectCol(parser: QueryParser): QueryProjectCol {
        const name = parser.expect("IDENTIFIER").value;
        parser.expect("FAT_ARROW");
        const expr = parseQueryScalarExpr(parser);
        return {name, expr};
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
                const cols = parseList(parseProjectCol, "COMMA")(parser);
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
    function parseBinopLeft(kind: QueryScalarBinopExpr["kind"], tokenType: QueryToken["type"]) {
        return (next: ParseFn<QueryScalarExpr>) => (parser: QueryParser) => {
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
                type: "NUMBER",
                value: token.value
            };
        } else if (token.type === "PAREN_LEFT") {
            parser.consume();
            const expr = parseQueryScalarExpr(parser);
            parser.expect("PAREN_RIGHT");
            return expr;
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    const stepDiv = parseBinopLeft("DIV", "SLASH")(parsePrimary);
    const stepMul = parseBinopLeft("MUL", "STAR")(stepDiv);
    const stepSub = parseBinopLeft("SUB", "DASH")(stepMul);
    const stepAdd = parseBinopLeft("ADD", "PLUS")(stepSub);
    const stepGte = parseBinopLeft("GTE", "GREATER_THAN_EQ")(stepAdd);
    const stepGt = parseBinopLeft("GT", "GREATER_THAN")(stepGte);
    const stepLte = parseBinopLeft("LTE", "LESS_THAN_EQ")(stepGt);
    const stepLt = parseBinopLeft("LT", "LESS_THAN")(stepLte);
    return stepLt(parser);
}