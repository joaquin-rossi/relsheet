import {isAlpha, isAlphanumeric, isNumeric} from "../../utils/language-utils.ts";
import type {SetType} from "../../utils/functional-utils.ts";

export type QueryToken =
    | { type: "IDENTIFIER"; value: string }
    | { type: "NUMBER"; value: number }
    | { type: QueryTokenPunctuation }
    ;

const punctuationSet = new Set([
    ",", "=>",
    "(", ")", "[", "]",
    "+", "-", "*", "/", "%", "**",
    "==", "!=",
    "<", "<=", ">", ">=",
    "|", "||", "&", "&&",
    "^", "<<", ">>",
] as const);

const punctuationMaxLength = Math.max(...[...punctuationSet].map(arr => arr.length));

export type QueryTokenPunctuation = SetType<typeof punctuationSet>;

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

        // skip comments
        if (c === "#") {
            i++;
            while (i < input.length && input[i++] !== "\n");
            continue;
        }

        // punctuation
        let punctuationFound = false;
        for (let l = punctuationMaxLength; l > 0; l--) {
            const s = input.substring(i, i + l);

            if (punctuationSet.has(s as any)) {
                i += l;
                tokens.push({type: s as QueryTokenPunctuation});
                punctuationFound = true;
                break;
            }
        }
        if (punctuationFound) {
            continue;
        }

        // identifier
        if (isAlpha(c)) {
            let start = i++;
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
            let start = i++;
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