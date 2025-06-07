import { audioContext } from "./audio";


export abstract class VisualizerData {

}

export class Visualizer extends VisualizerData {
    readonly gain: GainNode;
    readonly analyzer: AnalyserNode;

    constructor() {
        super();
        this.gain = audioContext.createGain();
        this.analyzer = audioContext.createAnalyser();
    }
}
