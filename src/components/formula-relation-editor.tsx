import {useMemo} from "react";
import type {FormulaRelationExpr} from "../model/formula-relation-expr.ts";
import type {RelationScope, RelationVal} from "../model/core.ts";
import type {MutVal} from "../utils/react-utils.ts";

export function FormulaRelationEditor(props: {
    expr: FormulaRelationExpr;
    scope: MutVal<RelationScope>,
    onChange: () => void;
}) {
    const value = useMemo(
        () => {
            try {
                return props.expr.run({
                    scope: props.scope.value,
                    callStack: [],
                });
            } catch (e) {
                if (e instanceof Error) {
                    return e;
                } else {
                    console.error(e);
                }
            }
        },
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
                borderColor: !(value == null || value instanceof Error) ? "green" : "red"
            }}
        ></textarea>

        {
            !value ? "Unknown error" :
                value instanceof Error ? value.message :
                    <FormulaResult value={value}/>
        }
    </div>;
}

function FormulaResult({value}: { value: RelationVal }) {
    return <div className="grid">
        <div className="grid_header">
            {value.cols.map((c, i) =>
                <input
                    key={i}
                    type="text"
                    value={c}
                    disabled={true}
                />
            )}
        </div>
        <div className="grid_body">
            {value.rows.map((r, i) =>
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
    </div>;
}

