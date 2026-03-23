import {FormulaRelationExpr, type Scope} from "../model.ts";
import {useMemo} from "react";

export function FormulaRelationEditor(props: {
    expr: FormulaRelationExpr;
    scope: Scope,
    onChange: () => void;
}) {
    const result = useMemo(
        () => props.expr.run({
            scope: props.scope,
            callStack: [],
        }),
        [props.scope, props.expr.query]
    );

    return <div className="formula">
        <textarea
            value={props.expr.query}
            onChange={e => {
                props.expr.query = e.target.value;
                props.onChange();
            }}
            className="formula_textarea"
            style={{
                borderColor: result != null ? "green" : "red"
            }}
        ></textarea>

        {result &&
            <div className="grid">
                <div className="grid_header">
                    {result.cols.map((c, i) =>
                        <input
                            key={i}
                            type="text"
                            value={c}
                            disabled={true}
                        />
                    )}
                </div>
                <div className="grid_body">
                    {result.rows.map((r, i) =>
                        <div key={i}
                             className="grid_row"
                        >
                            {r.map((v, j) =>
                                <input
                                    key={j}
                                    type="text"
                                    value={v}
                                    disabled={true}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>
        }
    </div>;
}