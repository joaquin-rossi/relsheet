import {isAlpha, isAlphanumeric, isNumeric} from "../../utils/language-utils.ts";

export type QueryToken =
    | { type: "IDENTIFIER"; value: string }
    | { type: "NUMBER"; value: number }
    | { type: "COMMA" }
    | { type: "PAREN_LEFT" }
    | { type: "PAREN_RIGHT" }
    | { type: "BRACKET_LEFT" }
    | { type: "BRACKET_RIGHT" }
    | { type: "PIPE" }
    | { type: "STAR" }
    | { type: "LESS_THAN" }
    | { type: "AND" }
    | { type: "DASH" }
    ;

export function tokenizeQuery(input: string): QueryToken[] {
    const tokens: QueryToken[] = [];
    let i = 0;

    while (i < input.length) {
        const c = input[i];

        // skip whitespace
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
            i++;
            continue;
        }

        // single-character tokens
        if (c === ",") {
            tokens.push({type: "COMMA"});
            i++;
            continue;
        } else if (c === "(") {
            tokens.push({type: "PAREN_LEFT"});
            i++;
            continue;
        } else if (c === ")") {
            tokens.push({type: "PAREN_RIGHT"});
            i++;
            continue;
        } else if (c === "[") {
            tokens.push({type: "BRACKET_LEFT"});
            i++;
            continue;
        } else if (c === "]") {
            tokens.push({type: "BRACKET_RIGHT"});
            i++;
            continue;
        } else if (c === "|") {
            tokens.push({type: "PIPE"});
            i++;
            continue;
        } else if (c === "*") {
            tokens.push({type: "STAR"});
            i++;
            continue;
        } else if (c === "<") {
            tokens.push({type: "LESS_THAN"});
            i++;
            continue;
        } else if (c === "&") {
            tokens.push({type: "AND"});
            i++;
            continue;
        } else if (c === "-") {
            tokens.push({type: "DASH"});
            i++;
            continue;
        }

        // identifier
        if (isAlpha(c)) {
            let start = i;
            i++;

            while (i < input.length && isAlphanumeric(input[i])) {
                i++;
            }

            tokens.push({
                type: "IDENTIFIER",
                value: input.slice(start, i),
            });

            continue;
        }

        // number
        if (isNumeric(c)) {
            let start = i;
            i++;

            while (i < input.length && isNumeric(input[i])) {
                i++;
            }

            tokens.push({
                type: "NUMBER",
                value: parseInt(input.slice(start, i)),
            });

            continue;
        }

        throw new Error(`Unexpected character '${c}' at position ${i}`);
    }

    return tokens;
}