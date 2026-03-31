import {type QueryToken} from "./query-lexer.ts";
import {Parser} from "../../utils/language-utils.ts";

export type QueryParser = Parser<QueryToken>;

export type QueryParseFn<E> = (parser: QueryParser) => E;

export type QueryRelExpr =
    | { type: "VARIABLE"; value: string }
    // identifier
    | QueryRelBinopExpr
    // rel_expr rel_binop rel_expr
    | { type: "PROJECT"; cols: QueryRelProjectCol[]; expr: QueryRelExpr }
    // "project" "[" <list(rel_project_col, ",")> "]" "(" rel_expr ")"
    | { type: "SELECT"; cond: QueryScalarExpr; expr: QueryRelExpr }
    // "select" "[" scalar_expr "]" "(" rel_expr ")"
    | { type: "NATURAL_JOIN"; left: QueryRelExpr; right: QueryRelExpr }
    // "natjoin" "(" rel_expr "," rel_expr ")"
    | { type: "LIMIT"; skip: QueryScalarExpr | undefined; take: QueryScalarExpr; inner: QueryRelExpr }
    // "limit" "[" (scalar_expr ",") scalar_expr "]" "(" rel_expr ")"
    ;

// identifier "=>" scalar_expr
export type QueryRelProjectCol = { name: string, expr: QueryScalarExpr };

export type QueryRelBinopExpr = {
    type: "BINOP";
    kind: "UNION" | "INTERSECTION" | "DIFFERENCE" | "CROSS"
    left: QueryRelExpr;
    right: QueryRelExpr;
}

export type QueryScalarExpr =
    | { type: "NUMBER"; value: number }
    | { type: "VARIABLE"; value: string }
    | QueryScalarUnopExpr
    | QueryScalarBinopExpr
    ;

export type QueryScalarUnopExpr = {
    type: "UNOP";
    kind:  "NEG" | "LOG_NOT" | "BIT_NOT";
    inner: QueryScalarExpr;
}

export type QueryScalarBinopExpr = {
    type: "BINOP";
    kind:
        | "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE"
        | "ADD" | "SUB" | "MUL" | "DIV" | "MOD" | "POW"
        | "LOG_AND" | "LOG_OR"
        | "BIT_AND" | "BIT_OR" | "BIT_XOR" | "BIT_SHL" | "BIT_SHR"
    left: QueryScalarExpr;
    right: QueryScalarExpr;
};

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
        return (next: QueryParseFn<QueryRelExpr>) => (parser: QueryParser) => {
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

    function parseProjectCol(parser: QueryParser): QueryRelProjectCol {
        const name = parser.expect("IDENTIFIER").value;
        parser.expect("=>");
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
                parser.expect("[");
                const cols = parseList(parseProjectCol, ",")(parser);
                parser.expect("]");
                parser.expect("(");
                const expr = parseQueryRelExpr(parser);
                parser.expect(")");

                return {
                    type: "PROJECT",
                    cols,
                    expr,
                };
            } else if (token.value === "select") {
                parser.expect("[");
                const cond = parseQueryScalarExpr(parser);
                parser.expect("]");
                parser.expect("(");
                const expr = parseQueryRelExpr(parser);
                parser.expect(")");

                return {
                    type: "SELECT",
                    cond,
                    expr,
                };
            } else if (token.value === "natjoin") {
                parser.expect("(");
                const left = parseQueryRelExpr(parser);
                parser.expect(",");
                const right = parseQueryRelExpr(parser);
                parser.expect(")");

                return {
                    type: "NATURAL_JOIN",
                    left,
                    right,
                };
            } else if (token.value === "limit") {
                parser.expect("[");

                let skip: QueryScalarExpr | undefined = undefined;
                let take = parseQueryScalarExpr(parser);
                if (parser.peek()?.type === ",") {
                    parser.consume();
                    skip = take;
                    take = parseQueryScalarExpr(parser);
                }

                parser.expect("]");
                parser.expect("(");
                const inner = parseQueryRelExpr(parser);
                parser.expect(")");

                return {
                    type: "LIMIT",
                    skip,
                    take,
                    inner,
                };
            } else {
                return {
                    type: "VARIABLE",
                    value: token.value,
                };
            }
        } else if (token.type === "(") {
            parser.consume();
            const expr = parseQueryRelExpr(parser);
            parser.expect(")");
            return expr;
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    const stepCross = parseBinopLeft("CROSS", "*")(parsePrimary);
    const stepDifference = parseBinopLeft("DIFFERENCE", "-")(stepCross);
    const stepIntersection = parseBinopLeft("INTERSECTION", "&")(stepDifference)
    const stepUnion = parseBinopLeft("UNION", "|")(stepIntersection);
    return stepUnion(parser);
}

function parseQueryScalarExpr(parser: QueryParser): QueryScalarExpr {
    function parseBinopLeft(kind: QueryScalarBinopExpr["kind"], tokenType: QueryToken["type"]) {
        return (next: QueryParseFn<QueryScalarExpr>) => (parser: QueryParser) => {
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

    function parseBinopRight(kind: QueryScalarBinopExpr["kind"], tokenType: QueryToken["type"]) {
        return (next: QueryParseFn<QueryScalarExpr>) => (parser: QueryParser): QueryScalarExpr => {
            let left = next(parser);

            if (parser.peek()?.type === tokenType) {
                parser.consume();

                return {
                    type: "BINOP",
                    kind,
                    left,
                    right: parseBinopRight(kind, tokenType)(next)(parser),
                };
            }

            return left;
        };
    }

    function parsePrimary(parser: QueryParser): QueryScalarExpr {
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
        } else if (token.type === "(") {
            parser.consume();
            const expr = parseQueryScalarExpr(parser);
            parser.expect(")");
            return expr;
        } else if (token.type === "-") {
            parser.consume();
            return {
                type: "UNOP",
                kind: "NEG",
                inner: parsePrimary(parser),
            }
        } else {
            throw new Error(`Unexpected token ${token.type}`);
        }
    }

    const stepPow = parseBinopRight("POW", "**")(parsePrimary);
    const stepMul = parseBinopLeft("MUL", "*")(stepPow);
    const stepDiv = parseBinopLeft("DIV", "/")(stepMul);
    const stepMod = parseBinopLeft("MOD", "%")(stepDiv);
    const stepAdd = parseBinopLeft("ADD", "+")(stepMod);
    const stepSub = parseBinopLeft("SUB", "-")(stepAdd);
    const stepBitShl = parseBinopLeft("BIT_SHL", "<<")(stepSub);
    const stepBitShr = parseBinopLeft("BIT_SHR", ">>")(stepBitShl);
    const stepLt = parseBinopLeft("LT", "<")(stepBitShr);
    const stepLte = parseBinopLeft("LTE", "<=")(stepLt);
    const stepGt = parseBinopLeft("GT", ">")(stepLte);
    const stepGte = parseBinopLeft("GTE", ">=")(stepGt);
    const stepEq = parseBinopLeft("EQ", "==")(stepGte);
    const stepNeq = parseBinopLeft("NEQ", "!=")(stepEq);
    const stepBitAnd = parseBinopLeft("BIT_AND", "&")(stepNeq);
    const stepBitXor = parseBinopLeft("BIT_XOR", "^")(stepBitAnd);
    const stepBitOr = parseBinopLeft("BIT_OR", "|")(stepBitXor);
    const stepLogAnd = parseBinopLeft("LOG_AND", "&&")(stepBitOr);
    const stepLogOr = parseBinopLeft("LOG_OR", "||")(stepLogAnd);
    return stepLogOr(parser);
}

function parseList<T>(itemParser: QueryParseFn<T>, itemSep: QueryToken["type"]) {
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