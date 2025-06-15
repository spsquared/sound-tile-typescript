export function printStackTrace() {
    console.debug(new Error().stack);
}