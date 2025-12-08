import Visualizer from "./visualizer";
import BeepboxVisualizer from "./beepbox";

window.addEventListener('load', async () => {
    while (true) {
        await new Promise<void>((resolve) => {
            if (!document.hidden) requestAnimationFrame(() => resolve());
            else setTimeout(() => resolve(), 200);
        });
        if (!document.hidden) {
            Visualizer.draw();
            BeepboxVisualizer.draw();
        }
    }
});