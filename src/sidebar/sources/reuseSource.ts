import { computed, ref } from "vue";

type ReusedSourceResult = [ArrayBuffer, string];
export namespace ReuseVisualizerSource {
    const pickingExistingSource = ref(false);
    let pendingPromise: (buffer: ReusedSourceResult | null) => any
    export async function pickExistingSource(): Promise<ReusedSourceResult | null> {
        if (pickingExistingSource.value) return null;
        pickingExistingSource.value = true;
        const buffer = await new Promise<ReusedSourceResult | null>((resolve) => pendingPromise = resolve);
        pickingExistingSource.value = false;
        return buffer;
    }
    export function resolveSource(buffer: ArrayBuffer, label: string): void {
        if (!pickingExistingSource.value) return;
        pendingPromise([buffer, label]);
    }
    export function cancelSource(): void {
        if (!pickingExistingSource.value) return;
        pendingPromise(null);
    }
    export const active = computed<boolean>(() => pickingExistingSource.value);
}