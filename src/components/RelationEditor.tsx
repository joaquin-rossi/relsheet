import {FormulaRelationExpr, GridRelationExpr, RelationExpr, type Scope} from "../model.ts";
import {mapFindKey} from "../utils/functional-utils.ts";
import {GridRelationEditor} from "./GridRelationEditor.tsx";
import {FormulaRelationEditor} from "./FormulaRelationEditor.tsx";

export function RelationEditor(props: {
    expr: RelationExpr;
    scope: Scope,
    onDelete: () => void;
    onNameChange: (name: string) => void;
    onChange: () => void;
}) {
    return <div className={"relation"}>
        {/* controls */}
        <div className="relation_controls">
            <input
                type="text"
                onChange={e =>
                    props.onNameChange(e.target.value)
                }
                style={{
                    borderColor: mapFindKey(props.scope, props.expr) != null ? "green" : "red"
                }}
            />
            <button
                onClick={props.onDelete}
                className="relation-controls_delete"
            >
                x
            </button>
        </div>

        {
            props.expr instanceof GridRelationExpr ? <GridRelationEditor expr={props.expr} onChange={props.onChange}/> :
                props.expr instanceof FormulaRelationExpr ?
                    <FormulaRelationEditor expr={props.expr} scope={props.scope} onChange={props.onChange}/> :
                    `INVALID TYPE: ${props.expr.constructor.name}`
        }
    </div>;
}