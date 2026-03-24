import "./App.css";
import {mapSet} from "./utils/functional-utils.ts";
import {RelationEditor} from "./components/relation-editor.tsx";
import type {RelationExpr} from "./model/core.ts";
import {GridRelationExpr} from "./model/grid-relation-expr.ts";
import {FormulaRelationExpr} from "./model/formula-relation-expr.ts";
import {GlobalScope} from "./utils/language-utils.ts";
import {atomMut, useAtomMut} from "./utils/react-utils.ts";

const exprsAtom = atomMut(new Array<RelationExpr>());
const exprsNamesAtom = atomMut(new Map<RelationExpr, string>());
const scopeAtom = atomMut(new GlobalScope<RelationExpr>());

export default function App() {
    const [exprs, setExprs, mutExprs] = useAtomMut(exprsAtom);
    const [exprNames, setExprNames, _mutExprNames] = useAtomMut(exprsNamesAtom);
    const [scope, _setScope, mutScope] = useAtomMut(scopeAtom);

    function handleExprAdd(e: RelationExpr) {
        setExprs(es => [...es, e])
    }

    function handleExprDelete(r: RelationExpr) {
        setExprs(es => es.filter(x => x !== r));
        mutScope(s => {
            const name = exprNames.value.get(r);
            if (name) {
                s.undefine(name);
            }
        });
    }

    function handleExprRename(r: RelationExpr, newName: string) {
        const oldName = exprNames.value.get(r);
        setExprNames(en => mapSet(en, r, newName));

        if (oldName) {
            if (newName === oldName) {
                // no change
                return;
            }
            mutScope(s => s.undefine(oldName));
        }

        if (scope.value.hasDefined(newName)) {
            // invalid: name already present
            return;
        }

        const nameRegex = /^[a-z][a-z0-9_]*$/;
        if (!nameRegex.test(newName)) {
            // invalid: name isn't allowed
            return;
        }

        mutScope(s => s.define(newName, r));
    }

    function handleExprChange() {
        mutExprs();
        mutScope();
    }

    return <>
        <header>
            <h1>Relsheet</h1>
            <div className={"button-panel"}>
                <button onClick={() => handleExprAdd(new GridRelationExpr())}>
                    Add grid
                </button>
                <button onClick={() => handleExprAdd(new FormulaRelationExpr())}>
                    Add formula
                </button>
            </div>
        </header>

        {/* relations */}
        <div className="relations">
            {exprs.value.map(e =>
                <RelationEditor
                    key={e.id}
                    expr={e}
                    scope={scope}
                    onDelete={() => handleExprDelete(e)}
                    name={exprNames.value.get(e) ?? ""}
                    onNameChange={newName => handleExprRename(e, newName)}
                    onChange={handleExprChange}
                />
            )}
        </div>
    </>;
}