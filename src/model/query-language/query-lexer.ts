import {isAlpha, isAlphanumeric, isNumeric} from "../../utils/language-utils.ts";

export type QueryToken =
    | { type: "IDENTIFIER"; value: string }
    | { type: "NUMBER"; value: number }
    | { type: QueryTokenPunctuation }
    ;

export type QueryTokenPunctuation =
    | "COMMA"
    | "PAREN_LEFT"
    | "PAREN_RIGHT"
    | "BRACKET_LEFT"
    | "BRACKET_RIGHT"
    | "PIPE"
    | "PLUS"
    | "STAR"
    | "LESS_THAN"
    | "AND"
    | "DASH"
    | "FAT_ARROW"
    | "LESS_THAN_EQ"
    | "GREATER_THAN_EQ"
    | "GREATER_THAN"
    | "SLASH"
;

export function tokenizeQuery(input: string): QueryToken[] {
    const tokens: QueryToken[] = [];
    let i = 0;

    while (i < input.length) {
        const c = input[i];
        const cn = (n: number) => input.substring(i, i + n);

        // skip whitespace
        if (c === " " || c === "\t" || c === "\n" || c === "\r") {
            i++;
            continue;
        }

        // dual-character tokens
        const dualCharacterTokens = new Map<string, QueryTokenPunctuation>([
            ["=>", "FAT_ARROW"],
            ["<=", "LESS_THAN_EQ"],
            [">=", "GREATER_THAN_EQ"],
        ]);
        const dualCharacterMatch = dualCharacterTokens.get(cn(2));
        if (dualCharacterMatch) {
            tokens.push({type: dualCharacterMatch});
            i += 2;
            continue;
        }

        // single-character tokens
        const singleCharacterTokens = new Map<string, QueryTokenPunctuation>([
            [",", "COMMA"],
            ["(", "PAREN_LEFT"],
            [")", "PAREN_RIGHT"],
            ["[", "BRACKET_LEFT"],
            ["]", "BRACKET_RIGHT"],
            ["|", "PIPE"],
            ["*", "STAR"],
            ["<", "LESS_THAN"],
            [">", "GREATER_THAN"],
            ["&", "AND"],
            ["-", "DASH"],
            ["+", "PLUS"],
            ["/", "SLASH"],
        ]);
        const singleCharacterMatch = singleCharacterTokens.get(c);
        if (singleCharacterMatch) {
            tokens.push({type: singleCharacterMatch});
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