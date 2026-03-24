import {useMemo} from "react";
import {arrayAppend, arrayResize} from "../utils/functional-utils.ts";
import type {GridRelationExpr} from "../model/grid-relation-expr.ts";

export function GridRelationEditor(props: {
    expr: GridRelationExpr;
    onChange: () => void;
}) {
    const inputCols = useMemo(
        () => arrayAppend(props.expr.cols, ""),
        [props.expr.cols]
    );

    const inputRows = useMemo(
        () => arrayAppend(
            props.expr.rows.map(row => arrayAppend(row, "")),
            arrayResize([], props.expr.numCols + 1, () => "")
        ),
        [props.expr.rows]
    );

    return <div className="grid">
        <div className="grid_header">
            {inputCols.map((c, i) =>
                <input
                    key={i}
                    type="text"
                    value={c}
                    onChange={e => {
                        props.expr.changeHeader(i, e.target.value);
                        props.onChange();
                    }}
                />
            )}
        </div>
        <div className="grid_body">
            {inputRows.map((r, i) =>
                <div key={i}
                     className="grid_row"
                >
                    {r.map((v, j) =>
                        <input
                            key={j}
                            type="text"
                            value={v}
                            onChange={e => {
                                props.expr.changeBody(i, j, e.target.value);
                                props.onChange();
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    </div>;
}