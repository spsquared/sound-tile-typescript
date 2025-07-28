<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue';
import { syncRef, throttledWatch, useElementSize } from '@vueuse/core';
import FileAccess from '@/components/inputs/fileAccess';
import TileEditor from '../editor';
import { VisualizerTile } from '../tiles';
import { VisualizerMode } from '../visualizerData';
import Visualizer from '../visualizer';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Slider from '@/components/inputs/Slider.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import ColorPicker from '@/components/inputs/colorPicker';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import rotateIcon from '@/img/rotate-dark.svg';
import flipHorizontalIcon from '@/img/flip-horizontal-dark.svg';
import flipVerticalIcon from '@/img/flip-vertical-dark.svg';
import volumeMuteIcon from '@/img/volume-mute-dark.svg';
import volume0Icon from '@/img/volume0-dark.svg';
import volume1Icon from '@/img/volume1-dark.svg';
import volume2Icon from '@/img/volume2-dark.svg';

const props = defineProps<{
    tile: VisualizerTile
}>();
const options = computed(() => props.tile.visualizer.data);

const wrapper = useTemplateRef('canvasWrapper');
onMounted(() => {
    wrapper.value?.appendChild(props.tile.canvas);
});
props.tile.canvas.classList.add('visualizerCanvas');

const { width: canvasWidth, height: canvasHeight } = useElementSize(wrapper);
// guess I don't need my throttling code anymore
throttledWatch([canvasWidth, canvasHeight], () => {
    props.tile.visualizer.resize(canvasWidth.value * devicePixelRatio, canvasHeight.value * devicePixelRatio);
}, { throttle: 50, immediate: true, leading: true, trailing: true });

const uploadSourceDisabled = ref(false);
async function uploadSource() {
    uploadSourceDisabled.value = true;
    const source = await FileAccess.openFilePicker({
        id: 'soundtileUploadSource',
        excludeAcceptAllOption: true,
        types: [{
            accept: {
                'audio/*': ['.aac', '.mp3', '.oga', '.ogg', '.wav', '.webm', '.m4a']
            }
        }]
    });
    if (source.length > 0) {
        const buffer = await source[0].arrayBuffer();
        options.value.buffer = buffer;
    }
    uploadSourceDisabled.value = false;
}

const gainIcon = computed(() => options.value.mute ? volumeMuteIcon : (options.value.gain > 0.6 ? volume2Icon : (options.value.gain > 0 ? volume1Icon : volume0Icon)));

// buh ref spam
const colorPicker1 = ColorPicker.createReactive(options.value.color);
const colorPicker2 = ColorPicker.createReactive(options.value.color2);
const colorSync1A = computed({ get: () => options.value.color, set: (c) => options.value.color = c });
const colorSync2A = computed({ get: () => options.value.color2, set: (c) => options.value.color2 = c });
const colorSync1B = computed({ get: () => colorPicker1.colorData, set: (c) => colorPicker1.colorData = c });
const colorSync2B = computed({ get: () => colorPicker2.colorData, set: (c) => colorPicker2.colorData = c });
syncRef(colorSync1A, colorSync1B);
syncRef(colorSync2A, colorSync2B);

const reflectionDisabled = computed(() => options.value.mode == VisualizerMode.SPECTROGRAM || options.value.mode == VisualizerMode.FREQ_LUMINANCE);
const barMinLengthDisabled = computed(() => options.value.freqOptions.bar.ledEffect || options.value.mode == VisualizerMode.FREQ_LUMINANCE);
const levelsMinLengthDisabled = computed(() => options.value.levelOptions.ledEffect);
</script>
<script lang="ts">
const frequencyModes = [VisualizerMode.FREQ_BAR, VisualizerMode.FREQ_LINE, VisualizerMode.FREQ_FILL, VisualizerMode.FREQ_LUMINANCE, VisualizerMode.SPECTROGRAM];
const waveformModes = [VisualizerMode.WAVE_DIRECT, VisualizerMode.WAVE_CORRELATED];
const spectrogramModes = [VisualizerMode.SPECTROGRAM];
const peakModes = [VisualizerMode.CHANNEL_PEAKS];
const barModes = [VisualizerMode.FREQ_BAR, VisualizerMode.FREQ_LUMINANCE];
const lineModes = [VisualizerMode.FREQ_LINE, VisualizerMode.FREQ_FILL];
const corrwaveModes = [VisualizerMode.WAVE_CORRELATED];
const secondaryColorSupportedModes = [VisualizerMode.FREQ_FILL];
const altColorSupportedModes = [VisualizerMode.FREQ_BAR, VisualizerMode.FREQ_LUMINANCE, VisualizerMode.SPECTROGRAM, VisualizerMode.CHANNEL_PEAKS];

const fftSizes = Array.from(new Array(11), (_v, i) => 2 ** (i + 5));
const channelCounts = Array.from(new Array(8), (_v, i) => i + 1);
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 500, minHeight: 300 }">
        <template v-slot:content>
            <div class="canvasWrapper" ref="canvasWrapper"></div>
            <div class="visualizerUploadCover" v-if="options.buffer === null">
                <input type="button" class="uploadButton" @click="uploadSource" value="Upload source audio" :disabled="uploadSourceDisabled || TileEditor.state.lock.locked">
            </div>
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <div class="optionsRows">
                    <div>
                        <label title="Audio source file">
                            <input type="button" class="uploadButton" @click="uploadSource" :value="options.buffer === null ? 'Upload source' : 'Replace source'" :disabled="uploadSourceDisabled || TileEditor.state.lock.locked">
                        </label>
                        <!-- future - linking multiple tiles to the same source audio -->
                    </div>
                    <div class="optionsGrid">
                        <label title="Volume (gain) of tile - affects visualizer and output">
                            Gain ({{ Math.round(options.gain * 100) }}%)
                            <Slider length="120px" v-model="options.gain" :min="0" :max="1.2" :step="0.01" :title="`Volume: ${Math.round(options.gain * 100)}%`"></Slider>
                        </label>
                        <label title="Mute - does not affect visualizer, only output">
                            Mute
                            <Toggle v-model="options.mute" :icon="gainIcon" icon-size="60% 60%"></Toggle>
                        </label>
                    </div>
                    <div>
                        <label title="Label of tile">
                            Label
                            <input type="text" v-model="props.tile.label">
                        </label>
                        <label title="Relative size of tile to sibling tiles">
                            Size
                            <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Visualizer Style">
                <div class="optionsRows">
                    <div>
                        <label title="Visualizer drawing style">
                            Mode
                            <select v-model="options.mode">
                                <option :value="VisualizerMode.FREQ_BAR">Freq (Bar)</option>
                                <option :value="VisualizerMode.FREQ_LINE">Freq (Line)</option>
                                <option :value="VisualizerMode.FREQ_FILL">Freq (Fill)</option>
                                <option :value="VisualizerMode.FREQ_LUMINANCE">Freq (Lumi)</option>
                                <option :value="VisualizerMode.WAVE_DIRECT">Wave (Direct)</option>
                                <option :value="VisualizerMode.WAVE_CORRELATED">Wave (Corr)</option>
                                <option :value="VisualizerMode.SPECTROGRAM">Spectrogram</option>
                                <option :value="VisualizerMode.CHANNEL_PEAKS">Channel Levels</option>
                            </select>
                        </label>
                        <label title="FFT window size - larger FFT increases frequency resolution">
                            FFT
                            <select v-model="options.fftSize">
                                <option v-for="size in fftSizes" :key="size" :value="size">{{ size }}</option>
                            </select>
                        </label>
                    </div>
                    <div class="optionsGrid">
                        <label title="Rotate the visualizer vertically">
                            Rotate
                            <Toggle v-model="options.rotate" :icon="rotateIcon"></Toggle>
                        </label>
                        <label title="Flip the visualizer horizontally, after rotating">
                            Flip X
                            <Toggle v-model="options.flipX" :icon="flipHorizontalIcon"></Toggle>
                        </label>
                        <label title="Flip the visualizer vertically, after rotating">
                            Flip Y
                            <Toggle v-model="options.flipY" :icon="flipVerticalIcon"></Toggle>
                        </label>
                        <label title="Padding in the direction of the visualizer (freq. axis for most, time axis for spectrogram)">
                            Pad Inline
                            <StrictNumberInput :min="0" :max="32" :strict-max="Infinity" :step="4" :strict-step="1" v-model="options.paddingInline"></StrictNumberInput>
                        </label>
                        <label title="Padding perpenditular to the direction of the visualizer (amp. axis for most, freq. axis for spectrogram)">
                            Pad Block
                            <StrictNumberInput :min="0" :max="32" :strict-max="Infinity" :step="4" :strict-step="1" v-model="options.paddingBlock"></StrictNumberInput>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Frequency Options" v-show="frequencyModes.includes(options.mode)">
                <div class="optionsGrid">
                    <div class="optionsGrid">
                        <label title="Smoothing of frequency data over time">
                            Smoothing<br>({{ Math.round(options.freqOptions.smoothing * 100) }}%)
                            <Slider length="100px" v-model="options.freqOptions.smoothing" :min="0" :max="1" :step="0.05" :title="`Smoothing: ${Math.round(options.freqOptions.smoothing * 100)}%`"></Slider>
                        </label>
                        <label title="Cutoff proportion of maximum frequency - dependent on device audio sample rate">
                            Freq Cut<br>({{ Math.round(options.freqOptions.freqCutoff * Visualizer.audioContext.sampleRate / 2) }}Hz)
                            <StrictNumberInput v-model="options.freqOptions.freqCutoff" :min="0" :max="1" :step="0.05" :strict-step="0"></StrictNumberInput>
                        </label>
                        <label title="Cutoff threshold for minimum decibels to show on the visualizer">
                            dB Cut<br>(dB)
                            <StrictNumberInput v-model="options.freqOptions.minDbCutoff" :min="-120" :strict-min="-Infinity" :max="0" :step="5" :strict-step="0.1"></StrictNumberInput>
                        </label>
                        <label title="Scaling factor of data">
                            Scale
                            <StrictNumberInput v-model:model-value="options.freqOptions.scale" :min="0" :max="2" :strict-max="Infinity" :step="0.05" :strict-step="0"></StrictNumberInput>
                        </label>
                    </div>
                    <div class="optionsGrid">
                        <label title="Symmetry mode on the frequency axis">
                            Symmetry
                            <select v-model="options.freqOptions.symmetry" style="width: 5em;">
                                <option value="none">None</option>
                                <option value="low">Low</option>
                                <option value="high">High</option>
                            </select>
                        </label>
                        <label title="&quot;Reflect&quot; the visualizer across an axis parallel to the frequency axis">
                            Reflect<br>({{ reflectionDisabled ? 0 : Math.round(options.freqOptions.reflect * 100) }}%)
                            <Slider length="100px" v-model="options.freqOptions.reflect" :min="0" :max="0.5" :step="0.01" :title="`Symmetry: ${Math.round(options.freqOptions.reflect * 100)}%`" :disabled="reflectionDisabled"></Slider>
                        </label>
                        <label title="Use a logarithmic frequency scale">
                            Log Scale
                            <Toggle v-model="options.freqOptions.useLogScale" disabled></Toggle>
                        </label>
                        <label title="Draw the frequency scale on the visualizer">
                            Draw Scale
                            <Toggle v-model="options.freqOptions.showScale" disabled></Toggle>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Waveform Options" v-show="waveformModes.includes(options.mode)">
                <div class="optionsRows">
                    <div>
                        <label title="Scale factor for amplitude of waveform">
                            Scale
                            <StrictNumberInput v-model="options.waveOptions.scale" :min="0" :max="10" :strict-max="Infinity" :step="0.1" :strict-step="0"></StrictNumberInput>
                        </label>
                        <label title="Reduce the time resolution of the waveform drawn by drawing only every N points">
                            Downsampling
                            <StrictNumberInput v-model="options.waveOptions.resolution" :min="1" :max="32" :step="1"></StrictNumberInput>
                        </label>
                    </div>
                    <div>
                        <label title="Thickness of lines in pixels">
                            Line Width
                            <StrictNumberInput v-model="options.waveOptions.thickness" :min="1" :max="32" :strict-max="256" :step="1"></StrictNumberInput>
                        </label>
                        <label title="Use mitered instead of rounded line joins">
                            Sharp Joins
                            <Toggle v-model="options.waveOptions.sharpEdges"></Toggle>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Channel Peak Options" v-show="peakModes.includes(options.mode)">
                <div class="optionsGrid">
                    <!-- most of this is a direct copy-paste of frequency and bar options -->
                    <div class="optionsGrid">
                        <label title="Number of audio channels to sample">
                            Channels
                            <select v-model="options.levelOptions.channels" style="width: 5em;">
                                <option v-for="i in channelCounts" :key="i" :value="i">{{ i }}</option>
                            </select>
                        </label>
                        <label title="Smoothing of levels over time">
                            Smoothing<br>({{ Math.round(options.levelOptions.frameSmoothing * 100).toString() }}%)
                            <Slider length="100px" v-model="options.levelOptions.frameSmoothing" :min="0" :max="1" :step="0.05" :title="`Smoothing: ${Math.round(options.levelOptions.frameSmoothing * 100)}%`"></Slider>
                        </label>
                        <label title="Scaling factor of frequency data">
                            Scale
                            <StrictNumberInput v-model:model-value="options.levelOptions.scale" :min="0" :max="2" :strict-max="Infinity" :step="0.05" :strict-step="0"></StrictNumberInput>
                        </label>
                        <label title="&quot;Reflect&quot; the visualizer across an axis parallel to the channel axis">
                            Reflect<br>({{ Math.round(options.levelOptions.reflect * 100) }}%)
                            <Slider length="100px" v-model="options.levelOptions.reflect" :min="0" :max="0.5" :step="0.01" :title="`Symmetry: ${Math.round(options.levelOptions.reflect * 100)}%`"></Slider>
                        </label>
                    </div>
                    <div class="optionsGrid">
                        <label title="Thickness of bars in proportion to available width per bar">
                            Size
                            <StrictNumberInput v-model="options.levelOptions.size" :min="0" :max="1" :step="0.05" :strict-step="0.01"></StrictNumberInput>
                        </label>
                        <label title="Use a logarithmic decibel scale">
                            Decibels
                            <Toggle v-model="options.levelOptions.useLogScale" disabled></Toggle>
                        </label>
                        <label title="Draw the frequency scale on the visualizer">
                            Draw Scale
                            <Toggle v-model="options.levelOptions.showScale" disabled></Toggle>
                        </label>
                        <label title="Label the channel numbers of each bar">
                            Draw Labels
                            <Toggle v-model="options.levelOptions.showLabels" disabled></Toggle>
                        </label>
                    </div>
                    <div class="optionsGrid">
                        <label title="Minimum length of bars when data is zero">
                            Min Length
                            <StrictNumberInput v-model="options.levelOptions.minLength" :min="0" :max="128" :strict-max="Infinity" :step="1" :disabled="levelsMinLengthDisabled"></StrictNumberInput>
                        </label>
                        <label title="Enable an LED bar-like effect">
                            LED Bar
                            <Toggle v-model="options.levelOptions.ledEffect"></Toggle>
                        </label>
                        <label title="Number of LEDs per bar of visualizer (on each side of reflection)" v-if="options.levelOptions.ledEffect">
                            LED Count
                            <StrictNumberInput v-model="options.levelOptions.ledCount" :min="4" :strict-min="1" :max="128" :strict-max="Infinity" :step="4"></StrictNumberInput>
                        </label>
                        <label title="Size of LEDs in proportion to available size per LED" v-if="options.levelOptions.ledEffect">
                            LED Size
                            <StrictNumberInput v-model="options.levelOptions.ledSize" :min="0" :max="1" :step="0.05" :strict-step="0.01"></StrictNumberInput>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Bar Style" v-show="barModes.includes(options.mode)">
                <div class="optionsRows">
                    <div>
                        <label title="Thickness of bars in proportion to available width per bar">
                            Size
                            <StrictNumberInput v-model="options.freqOptions.bar.size" :min="0" :max="1" :step="0.05" :strict-step="0.01"></StrictNumberInput>
                        </label>
                        <label title="Minimum length of bars when data is zero">
                            Min Length
                            <StrictNumberInput v-model="options.freqOptions.bar.minLength" :min="0" :max="128" :strict-max="Infinity" :step="1" :disabled="barMinLengthDisabled"></StrictNumberInput>
                        </label>
                        <label title="Enable an LED bar-like effect">
                            LED Bar
                            <Toggle v-model="options.freqOptions.bar.ledEffect"></Toggle>
                        </label>
                    </div>
                    <div class="optionsGrid" v-if="options.freqOptions.bar.ledEffect">
                        <label title="Number of LEDs per bar of visualizer (on each side of reflection)">
                            LED Count
                            <StrictNumberInput v-model="options.freqOptions.bar.ledCount" :min="4" :strict-min="1" :max="128" :strict-max="Infinity" :step="4"></StrictNumberInput>
                        </label>
                        <label title="Size of LEDs in proportion to available size per LED">
                            LED Size
                            <StrictNumberInput v-model="options.freqOptions.bar.ledSize" :min="0" :max="1" :step="0.05" :strict-step="0.01"></StrictNumberInput>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Line Style" v-show="lineModes.includes(options.mode)">
                <label title="Thickness of lines in pixels">
                    Line Width
                    <StrictNumberInput v-model="options.freqOptions.line.thickness" :min="1" :max="32" :strict-max="256" :step="1"></StrictNumberInput>
                </label>
                <label title="Use mitered instead of rounded line joins">
                    Sharp Joins
                    <Toggle v-model="options.freqOptions.line.sharpEdges"></Toggle>
                </label>
            </TileOptionsSection>
            <TileOptionsSection title="Spectrogram Style" v-show="spectrogramModes.includes(options.mode)">
                <div class="optionsGrid">
                    <label title="Length of history in frames, dependent on device framerate, higher is longer time but slower">
                        History<br>({{ (options.freqOptions.spectrogram.historyLength / 60).toFixed(1) }}s @ 60fps)
                        <StrictNumberInput v-model="options.freqOptions.spectrogram.historyLength" :min="20" :strict-min="1" :max="1200" :strict-max="18000" :step="20" :strict-step="1"></StrictNumberInput>
                    </label>
                    <label title="Quantizes frequency data into discrete levels to help performance, setting to <2 disables it">
                        Quantization
                        <StrictNumberInput v-model="options.freqOptions.spectrogram.quantization" :min="0" :max="16" :strict-max="128" :step="2" :strict-step="1"></StrictNumberInput>
                    </label>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="CorrWave" v-show="corrwaveModes.includes(options.mode)">
                <div class="optionsGrid">
                    <label title="Smoothing of previous waveform &quot;memory&quot; over time">
                        Smoothing<br>({{ Math.round(options.waveOptions.correlation.frameSmoothing * 100) }}%)
                        <Slider length="100px" v-model="options.waveOptions.correlation.frameSmoothing" :min="0" :max="1" :step="0.05" :title="`Smoothing: ${Math.round(options.waveOptions.correlation.frameSmoothing * 100)}%`"></Slider>
                    </label>
                    <label title="Number of samples in initial sampling of frame, higher is better but slower">
                        Samples
                        <StrictNumberInput v-model="options.waveOptions.correlation.samples" :min="2" :max="64" :strict-max="128" :step="2"></StrictNumberInput>
                    </label>
                    <label title="Gain of gradient descent error minimization of frame">
                        GD<br>Gain
                        <StrictNumberInput v-model="options.waveOptions.correlation.gradientDescentGain" :min="0" :max="1" :strict-max="4" :step="0.1" :strict-step="0.01"></StrictNumberInput>
                    </label>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Colors">
                <!-- fixed height stops weird resizing -->
                <div class="optionsGrid" style="height: 44px;">
                    <label title="Background color of tile">
                        Background
                        <EnhancedColorPicker :picker="props.tile.backgroundColor" badge-width="60px"></EnhancedColorPicker>
                    </label>
                    <label title="Visualizer primary color">
                        Primary
                        <EnhancedColorPicker :picker="colorPicker1" badge-width="60px"></EnhancedColorPicker>
                    </label>
                    <label title="Visualizer secondary color" v-if="secondaryColorSupportedModes.includes(options.mode)">
                        Secondary
                        <EnhancedColorPicker :picker="colorPicker2" badge-width="60px"></EnhancedColorPicker>
                    </label>
                    <label title="Apply additional opacity to secondary color - setting to below 1 triggers special translucency handling for Freq. Fill mode" v-if="secondaryColorSupportedModes.includes(options.mode)">
                        Alpha
                        <StrictNumberInput v-model="options.color2Alpha" :min="0" :max="1" :step="0.01"></StrictNumberInput>
                    </label>
                    <label title="Apply color pallete using alternative style" v-if="altColorSupportedModes.includes(options.mode)">
                        Alt Color
                        <Toggle v-model="options.altColorMode"></Toggle>
                    </label>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Modulation">
                Modulation drag-and-drop UI coming soon!
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style>
.visualizerCanvas {
    width: 100%;
    height: 100%;
    background-color: transparent;
}
</style>
<style scoped>
.canvasWrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
}

.visualizerUploadCover {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
}

.optionsRows {
    display: flex;
    flex-direction: column;
    width: 100%;
    row-gap: 4px;
}

.optionsRows>div {
    display: flex;
    flex-direction: row;
    column-gap: 12px;
}

.optionsGrid {
    display: grid !important;
    grid-auto-rows: min-content;
    grid-auto-columns: max-content;
    grid-auto-flow: column;
    width: 100%;
    align-items: center;
    row-gap: 2px;
    column-gap: 12px;
}

.optionsGrid>label {
    display: grid;
    grid-template-rows: subgrid;
    grid-template-columns: 1fr;
    grid-row: span 2;
    align-items: center;
    justify-items: center;
    text-align: center;
}

.optionsGrid>.optionsGrid {
    grid-template-columns: subgrid;
    /* if there's more than 1000 items there will be bigger problems */
    grid-column: 1 / 1000;
}

.uploadButton {
    background-color: dodgerblue;
}

.uploadButton:hover {
    background-color: color-mix(in hsl, dodgerblue 80%, cyan 20%);
}

.uploadButton:disabled {
    background-color: gray;
}

/**Inputs are all sorts of weird lengths here */
input[type=number] {
    width: 5em;
}
</style>