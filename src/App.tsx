import "./App.css";
import {useState} from "react";
import {FormulaRelationExpr, GridRelationExpr, RelationExpr, type Scope} from "./model.ts";
import {arrayDup, mapDel, mapDup, mapFindKey, mapSet} from "./utils/functional-utils.ts";
import {RelationEditor} from "./components/RelationEditor.tsx";

export default function App() {
    const [exprs, setExprs] = useState<RelationExpr[]>([]);
    const [scope, setScope] = useState<Scope>(new Map());

    function handleRelationAdd(r: RelationExpr) {
        setExprs(rs => [...rs, r]);
    }

    function handleRelationDel(r: RelationExpr) {
        setExprs(rs => rs.filter(x => x !== r));
        setScope(s => {
            const key = mapFindKey(s, r);
            if (key) {
                return mapDel(s, key);
            } else {
                return s;
            }
        });
    }

    function handleRelationRename(r: RelationExpr, newName: string) {
        const oldName = mapFindKey(scope, r);
        if (oldName) {
            if (newName === oldName) {
                // no change
                return;
            }
            setScope(s => mapDel(s, oldName));
        }

        if (scope.get(newName) != null) {
            // invalid: name already present
            return;
        }

        const nameRegex = /^[a-z][a-z0-9_]*$/;
        if (!nameRegex.test(newName)) {
            // invalid: name isn't allowed
            return;
        }

        setScope(s => mapSet(s, newName, r));
    }

    function handleExprChange() {
        setExprs(arrayDup);
        setScope(mapDup);
    }

    return <>
        <header>
            <h1>Relsheet</h1>
            <div className={"button-panel"}>
                <button onClick={() => handleRelationAdd(new GridRelationExpr())}>
                    Add grid
                </button>
                <button onClick={() => handleRelationAdd(new FormulaRelationExpr())}>
                    Add formula
                </button>
            </div>
        </header>

        {/* relations */}
        <div className="relations">
            {exprs.map(e =>
                <RelationEditor
                    key={e.id}
                    expr={e}
                    scope={scope}
                    onDelete={() => handleRelationDel(e)}
                    onNameChange={newName => handleRelationRename(e, newName)}
                    onChange={handleExprChange}
                />
            )}
        </div>
    </>;
}