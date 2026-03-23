import {arrayAppend, arrayDup, arrayHasRepeats, arrayResize, arraySet, arrayUpdate} from "./utils/functional-utils.ts";

export type RelationVal = {
    cols: string[];
    rows: string[][];
};

export type Scope = Map<string, RelationExpr>;

export type EvalCtx = {
    scope: Scope,
    callStack: RelationExpr[],
};

export abstract class RelationExpr {
    readonly id: string = crypto.randomUUID();

    abstract run(ctx: EvalCtx): RelationVal | undefined;
}

export class GridRelationExpr extends RelationExpr {
    cols: string[] = [];
    rows: string[][] = [];

    override run(_ctx: EvalCtx): RelationVal | undefined {
        const invalidCol = (col: string) => col.length === 0;
        if (this.cols.some(invalidCol) || arrayHasRepeats(this.cols)) {
            return undefined;
        }

        return {
            cols: arrayDup(this.cols),
            rows: this.rows.map(r => arrayDup(r)),
        };
    }

    get numCols(): number {
        return this.cols.length;
    }

    get numRows(): number {
        return this.rows.length;
    }

    set numCols(n: number) {
        this.#resize(n, this.numRows);
    }

    set numRows(n: number) {
        this.#resize(this.numCols, n);
    }

    #resize(numCols: number, numRows: number): void {
        this.cols = arrayResize(this.cols, numCols, () => "");
        this.rows = arrayResize(this.rows, numRows, () => [])
            .map(row => arrayResize(row, numCols, () => ""));
    }

    changeHeader(i: number, newValue: string): void {
        if (i < 0) throw new RangeError("i must be >= 0");

        newValue = newValue.trim();
        if (i >= this.numCols) {
            this.numCols = i + 1;
        }
        this.cols = arraySet(this.cols, i, newValue);
        this.#compact();
    }

    changeBody(i: number, j: number, newValue: string): void {
        if (i < 0) throw new RangeError("i must be >= 0");
        if (j < 0) throw new RangeError("j must be >= 0");

        newValue = newValue.trim();

        if (i >= this.numRows) {
            this.numRows = i + 1;
        }
        if (j >= this.numCols) {
            this.numCols = j + 1;
        }
        this.rows = arrayUpdate(
            this.rows, i,
            r => arraySet(r, j, newValue)
        );
        this.#compact();
    }

    #compact(): void {
        const numNonEmptyCols = Math.max(
            this.cols.findLastIndex(v => v.length > 0) + 1,
            ...this.rows.map(row =>
                row.findLastIndex(v => v.length > 0) + 1
            ),
        );
        if (numNonEmptyCols !== this.numCols) {
            this.numCols = numNonEmptyCols;
        }

        const numNonEmptyRows = this.rows.findLastIndex(
            row => row.some(v => v.length > 0)
        ) + 1;
        if (numNonEmptyRows !== this.numRows) {
            this.numRows = numNonEmptyRows;
        }
    }
}

export class FormulaRelationExpr extends RelationExpr {
    query: string = "";

    // TODO: mejorar lenguaje
    override run(ctx: EvalCtx): RelationVal | undefined {
        const words = this.query.split(/\s+/);
        if (words.length != 1) {
            return undefined;
        }
        const calleeName = words[0];

        ctx = {
            scope: ctx.scope,
            callStack: arrayAppend(ctx.callStack, this),
        };

        const callee = ctx.scope.get(calleeName);
        if (!callee || ctx.callStack.includes(callee)) {
            return undefined;
        }

        return callee.run(ctx);
    }
}