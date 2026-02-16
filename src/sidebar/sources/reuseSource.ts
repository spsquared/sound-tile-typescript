import { computed, ref } from 'vue';
import TileEditor from '@/visualizer/editor';

namespace ReuseVisualizerSource {
    export type ReusedSourceResult = [ArrayBuffer, string];
    const pickingExistingSource = ref(false);
    let pendingPromise: (buffer: ReusedSourceResult | null) => any
    export async function pickExistingSource(): Promise<ReusedSourceResult | null> {
        if (pickingExistingSource.value || TileEditor.lock.locked) return null;
        TileEditor.lock.acquire();
        pickingExistingSource.value = true;
        const buffer = await new Promise<ReusedSourceResult | null>((resolve) => pendingPromise = resolve);
        pickingExistingSource.value = false;
        TileEditor.lock.release();
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

export default ReuseVisualizerSource;
