export type QueryToken =
    | { type: "IDENTIFIER"; value: string }
    | { type: "COMMA" }
    | { type: "PAREN_LEFT" }
    | { type: "PAREN_RIGHT" }
    | { type: "BRACKET_LEFT" }
    | { type: "BRACKET_RIGHT" }
    | { type: "PIPE" }
    | { type: "STAR" }
    ;

export function tokenizeQuery(query: string): QueryToken[] {
    const tokens: QueryToken[] = [];
    let i = 0;

    const isAlpha = (c: string) =>
        (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";

    const isAlphanumeric = (c: string) =>
        isAlpha(c) || (c >= "0" && c <= "9");

    while (i < query.length) {
        const c = query[i];

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
        }

        // identifier
        if (isAlpha(c)) {
            let start = i;
            i++;

            while (i < query.length && isAlphanumeric(query[i])) {
                i++;
            }

            tokens.push({
                type: "IDENTIFIER",
                value: query.slice(start, i),
            });

            continue;
        }

        throw new Error(`Unexpected character '${c}' at position ${i}`);
    }

    return tokens;
}