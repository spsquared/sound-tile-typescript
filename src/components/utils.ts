export function printStackTrace() {
    console.debug(new Error().stack);
}

export type primitive = number | string | boolean | bigint | symbol

export type DeepPartial<T, Ignore = never> = T extends Ignore | primitive ? T : (
    T extends (infer E)[] ? DeepPartial<E>[] : (
        T extends object ? { [K in keyof T]?: DeepPartial<T[K], Ignore> } : T
    )
);

export async function sleep(ms: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}
