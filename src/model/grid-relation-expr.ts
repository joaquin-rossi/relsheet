import {type EvalCtx, RelationExpr, type RelationVal} from "./core.ts";
import {arrayDup, arrayHasRepeats, arrayResize, arraySet, arrayUpdate} from "../utils/functional-utils.ts";

export class GridRelationExpr extends RelationExpr {
    cols: string[] = [];
    rows: string[][] = [];

    override run(_ctx: EvalCtx): RelationVal {
        const invalidCol = (col: string) => col.length === 0;
        if (this.cols.some(invalidCol) || arrayHasRepeats(this.cols)) {
            throw new Error("Invalid cols");
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

