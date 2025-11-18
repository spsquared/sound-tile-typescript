import { computed, ref } from "vue";

export namespace ReuseVisualizerSource {
    const pickingExistingSource = ref(false);
    let pendingPromise: (buffer: ArrayBuffer | null) => any
    export async function pickExistingSource(): Promise<ArrayBuffer | null> {
        if (pickingExistingSource.value) return null;
        pickingExistingSource.value = true;
        const buffer = await new Promise<ArrayBuffer | null>((resolve) => pendingPromise = resolve);
        pickingExistingSource.value = false;
        return buffer;
    }
    export function resolveSource(buffer: ArrayBuffer): void {
        if (!pickingExistingSource.value) return;
        pendingPromise(buffer);
    }
    export function cancelSource(): void {
        if (!pickingExistingSource.value) return;
        pendingPromise(null);
    }
    export const active = computed<boolean>(() => pickingExistingSource.value);
}