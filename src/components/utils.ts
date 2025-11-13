export function printStackTrace() {
    console.debug(new Error().stack);
}

export type DeepPartial<T, Ignore = never> = T extends Ignore ? T : (T extends object ? {
    [K in keyof T]?: DeepPartial<T[K], Ignore>
} : T);

export async function sleep(ms: number): Promise<void> {
    await new Promise<void>(resolve => setTimeout(() => resolve(), ms));
}