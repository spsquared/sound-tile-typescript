declare module 'trix' {
    // not jank
    const a: any = {};
    export default a;
}

declare global {
    interface Window {
        Trix: any;
    }
}
