import {useAtom, type PrimitiveAtom, atom} from "jotai";
import {useCallback} from "react";

export type MutVal<T> = Readonly<{ value: T, version: number }>;
export type MutAtom<T> = PrimitiveAtom<MutVal<T>>;

export function atomMut<T>(value: T): MutAtom<T> {
    return atom({value, version: 0});
}

export function useAtomMut<T>(
    a: MutAtom<T>,
): [
    MutVal<T>,
    (f: (t: T) => T) => void,
    (f?: (t: T) => void) => void,
] {
    const [mut, setMut] = useAtom(a);

    const setVal = useCallback(
        (f: (t: T) => T) => setMut(m => ({
            version: m.version + 1,
            value: f(m.value),
        })),
        [mut, setMut]
    );

    const mutVal = useCallback(
        (f: (t: T) => void = () => {}) => setMut(m => {
            f(m.value);
            return {
                version: m.version,
                value: m.value
            };
        }),
        [mut, setMut]
    );

    return [mut, setVal, mutVal];
}