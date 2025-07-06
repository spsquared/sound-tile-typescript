
export type DeepPartial<T, Ignore = never> = T extends Ignore ? T : (T extends object ? {
    [K in keyof T]?: DeepPartial<T[K], Ignore>
} : T);
