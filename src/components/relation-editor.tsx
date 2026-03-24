import {GridRelationEditor} from "./grid-relation-editor.tsx";
import {FormulaRelationEditor} from "./formula-relation-editor.tsx";
import {RelationExpr, type RelationScope} from "../model/core.ts";
import {GridRelationExpr} from "../model/grid-relation-expr.ts";
import {FormulaRelationExpr} from "../model/formula-relation-expr.ts";
import type {MutVal} from "../utils/react-utils.ts";

export function RelationEditor(props: {
    expr: RelationExpr;
    scope: MutVal<RelationScope>,
    onDelete: () => void;
    name: string;
    onNameChange: (name: string) => void;
    onChange: () => void;
}) {
    const scope = props.scope;

    return <div className={"relation"}>
        {/* controls */}
        <div className="relation_controls">
            <input
                type="text"
                value={props.name}
                onChange={e =>
                    props.onNameChange(e.target.value)
                }
                style={{
                    borderColor: scope.value.get(props.name) === props.expr ? "green" : "red"
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
                    <FormulaRelationEditor expr={props.expr} scope={scope} onChange={props.onChange}/> :
                    `INVALID TYPE: ${props.expr.constructor.name}`
        }
    </div>;
}