import { toRaw, isRef, isReactive, isProxy, } from 'vue';

// https://github.com/vuejs/core/issues/5303
export function deepToRaw<T extends Record<string, any>>(sourceObj: T): T {
    const objectIterator = (input: any): any => {
        if (Array.isArray(input)) {
            return input.map((item) => objectIterator(item));
        }
        if (isRef(input) || isReactive(input) || isProxy(input)) {
            return objectIterator(toRaw(input));
        }
        if (input && typeof input === 'object') {
            return Object.keys(input).reduce((acc, key) => {
                acc[key as keyof typeof acc] = objectIterator(input[key]);
                return acc;
            }, {} as T);
        }
        return input;
    };

    return objectIterator(sourceObj);
}

export type DeepPartial<T, Ignore = never> = T extends Ignore ? T : (T extends object ? {
    [K in keyof T]?: DeepPartial<T[K], Ignore>
} : T);
