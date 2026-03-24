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
