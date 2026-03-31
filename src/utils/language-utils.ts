export type ParserToken = {
    type: string
};

export class Parser<Tok extends ParserToken> {
    readonly #tokens: Tok[];
    #pos = 0;

    constructor(tokens: Tok[]) {
        this.#tokens = tokens;
    }

    peek(): Tok | undefined {
        return this.#tokens[this.#pos];
    }

    consume(): Tok {
        const token = this.peek();
        if (!token) {
            throw new Error("Unexpected end of input");
        }
        this.#pos++;
        return token;
    }

    expect<TokType extends Tok["type"]>(
        type: TokType,
    ): Extract<Tok, { type: TokType }> {
        const token = this.consume();
        if (token.type !== type) {
            throw new Error(`Expected ${type}, got ${token.type}`);
        }
        return token as Extract<Tok, { type: TokType }>;
    }
}

export interface Scope<T> {
    get(name: string): T | undefined;
    set(name: string, val: T): void;
    has(name: string): boolean;

    define(name: string, val: T): void;
    undefine(name: string): void;
    hasDefined(name: string): boolean;
}

export class GlobalScope<T> implements Scope<T>{
    readonly #map: Map<string, T>;

    constructor(map: Map<string, T> = new Map()) {
        this.#map = map;
    }

    get(name: string): T | undefined {
        return this.#map.get(name);
    }

    set(name: string, val: T): void {
        this.#map.set(name, val);
    }

    has(name: string): boolean {
        return this.#map.has(name);
    }

    define(name: string, val: T): void {
        this.#map.set(name, val);
    }

    undefine(name: string): void {
        this.#map.delete(name);
    }

    hasDefined(name: string): boolean {
        return this.#map.has(name);
    }
}

export class LocalScope<T> implements Scope<T>{
    readonly #parent: Scope<T>;
    readonly #map: Map<string, T>;

    constructor(parent: Scope<T>, map: Map<string, T> = new Map()) {
        this.#parent = parent;
        this.#map = map;
    }

    get(name: string): T | undefined {
        if (this.#map.has(name)) {
            return this.#map.get(name);
        } else {
            return this.#parent.get(name);
        }
    }

    set(name: string, val: T): void {
        if (this.#map.has(name)) {
            this.#map.set(name, val);
        } else {
            this.#parent.set(name, val);
        }
    }

    has(name: string): boolean {
        return this.#map.has(name) || this.#parent.has(name);
    }

    define(name: string, val: T): void {
        this.#map.set(name, val);
    }

    undefine(name: string): void {
        this.#map.delete(name);
    }

    hasDefined(name: string): boolean {
        return this.#map.has(name);
    }
}

export function dedent(str: string): string;
export function dedent(strings: TemplateStringsArray, ...values: any[]): string;
export function dedent(strings: string | TemplateStringsArray, ...values: any[]): string {
    // 1. Handle Tagged Template vs Regular String call
    let rawString: string;

    if (typeof strings === 'string') {
        rawString = strings;
    } else {
        // Re-assemble the template literal with values
        rawString = strings.reduce((acc, str, i) => {
            const val = values[i] !== undefined ? String(values[i]) : '';
            return acc + str + val;
        }, '');
    }

    const lines = rawString.split('\n');

    // 2. Find the minimum common indentation (ignoring empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
        if (line.trim().length === 0) continue;
        const match = line.match(/^[ \t]*/);
        const count = match ? match[0].length : 0;
        if (count < minIndent) minIndent = count;
    }

    const finalIndent = minIndent === Infinity ? 0 : minIndent;

    // 3. Strip indentation and clean up first/last empty lines
    return lines
        .map(line => line.slice(finalIndent))
        .join('\n')
        .replace(/^\n+|\n+$/g, '');
}

export function isAlpha(c: string) {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_";
}

export function isNumeric(c: string) {
    return c >= "0" && c <= "9";
}

export function isAlphanumeric(c: string) {
    return isAlpha(c) || isNumeric(c);
}