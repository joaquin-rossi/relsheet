export function mapFindKey<K, V>(map: Map<K, V>, targetVal: V): K | undefined {
    for (const [key, value] of map.entries()) {
        if (value === targetVal) {
            return key;
        }
    }
    return undefined;
}

export function mapDel<K, V>(map: Map<K, V>, key: K): Map<K, V> {
    const result = new Map(map);
    result.delete(key);
    return result;
}

export function mapSet<K, V>(map: Map<K, V>, key: K, val: V): Map<K, V> {
    const result = new Map(map);
    result.set(key, val);
    return result;
}

export function mapDup<K, V>(map: Map<K, V>): Map<K, V> {
    return new Map(map);
}

export function arrayDup<T>(arr: T[]): T[] {
    return [...arr];
}

export function arrayResize<T>(
    arr: T[],
    newLength: number,
    defaultFactory: (index?: number) => T
): T[] {
    if (arr.length > newLength) {
        return arr.slice(0, newLength);
    } else if (arr.length < newLength) {
        const extra = Array.from(
            {length: newLength - arr.length},
            (_, i) => defaultFactory(arr.length + i)
        );
        return arr.concat(extra);
    } else {
        return arr;
    }
}

export function arraySet<T>(
    arr: T[],
    idx: number,
    val: T
): T[] {
    arr = [...arr];
    arr[idx] = val;
    return arr;
}

export function arrayUpdate<T>(
    arr: T[],
    idx: number,
    f: (t: T) => T
): T[] {
    arr = [...arr];
    arr[idx] = f(arr[idx]);
    return arr;
}

export function arrayAppend<T>(arr: T[], val: T): T[] {
    return [...arr, val];
}

export function arrayHasRepeats<T>(arr: T[]): boolean {
    return new Set(arr).size < arr.length;
}