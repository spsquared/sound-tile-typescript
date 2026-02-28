import { isInWorker, webgpuSupported } from '@/constants';
import type { RendererMessageData, RendererMessageEvent, BeepboxSettingsData } from './beepboxRenderer';
import BeepboxRenderInstance from './beepboxRInstAbstract';
import WGPURenderer from './beepboxRInstWebgpu';
import Canvas2dRenderer from './beepboxRInstCanvas';

/**Attempt to create a WebGPU renderer, and if WGPU isn't supported, use fallback Canvas2D renderer */
export function createBeepboxRenderInstance(canvas: OffscreenCanvas, data: BeepboxSettingsData): BeepboxRenderInstance {
    if (webgpuSupported) return new WGPURenderer(canvas, data);
    return new Canvas2dRenderer(canvas, data);
}

// reexport because fuck you
export default BeepboxRenderInstance;

// wrap a visualizer render instance for communication
if (isInWorker) {
    onmessage = (e) => {
        const renderer = createBeepboxRenderInstance(e.data[0], e.data[1]);
        onmessage = async (e: RendererMessageEvent) => {
            switch (e.data.type) {
                case 'draw':
                    renderer.playing = e.data.playing;
                    renderer.debugInfo = e.data.debug;
                    await renderer.draw(e.data.time);
                    postMessage({
                        type: 'drawResponse',
                        ...renderer.frameResult
                    } satisfies RendererMessageData);
                    break;
                case 'resize':
                    renderer.resize(e.data.w, e.data.h);
                    break;
                case 'settings':
                    const res = renderer.updateData(e.data.data);
                    postMessage({
                        type: 'loadResult',
                        ...res
                    } satisfies RendererMessageData);
                    break;
                case 'stop':
                    // everything should be blocking in the worker, no async, so no need for locks
                    close();
                    break;
            }
        };
    }
}
