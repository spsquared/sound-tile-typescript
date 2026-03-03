import { useMouse } from '@vueuse/core';

// look mom i saved a single event handler!
export const mousePos = useMouse();

export function pointerPositionNaive(e: MouseEvent | TouchEvent): { x: number, y: number } {
    return 'touches' in e ? {
        x: e.touches[0]?.clientX ?? 0,
        y: e.touches[0]?.clientY ?? 0
    } : {
        x: e.clientX,
        y: e.clientY
    };
}
