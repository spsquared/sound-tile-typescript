<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import { syncRef, throttledWatch, useElementSize } from '@vueuse/core';
import { VisualizerTile } from '../tiles';
import { openFilePicker } from '@/components/inputs/fileAccess';
import { VisualizerMode } from '../visualizerData';
import BaseTile from './BaseTile.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import Slider from '@/components/inputs/Slider.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import ColorPicker from '@/components/inputs/colorPicker';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';

const props = defineProps<{
    tile: VisualizerTile
}>();

const wrapper = useTemplateRef('canvasWrapper');
onMounted(() => {
    wrapper.value?.appendChild(props.tile.canvas);
    props.tile.visualizer.visible = true;
});
onBeforeUnmount(() => {
    props.tile.visualizer.visible = false;
})
props.tile.canvas.classList.add('visualizerCanvas');

const { width: canvasWidth, height: canvasHeight } = useElementSize(props.tile.canvas);
// guess I don't need my throttling code anymore
throttledWatch([canvasWidth, canvasHeight], () => {
    props.tile.visualizer.resize(canvasWidth.value * devicePixelRatio, canvasHeight.value * devicePixelRatio);
}, { throttle: 100, leading: true, trailing: true, immediate: true });

const uploadSourceDisabled = ref(false);
async function uploadSource() {
    uploadSourceDisabled.value = true;
    const source = await openFilePicker({
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
        props.tile.visualizer.data.buffer = buffer;
    }
    uploadSourceDisabled.value = false;
}

// buh ref spam
const colorPicker1 = ColorPicker.createReactive(props.tile.visualizer.data.color);
const colorPicker2 = ColorPicker.createReactive(props.tile.visualizer.data.color2);
const colorSync1A = computed({ get: () => props.tile.visualizer.data.color, set: (c) => props.tile.visualizer.data.color = c });
const colorSync2A = computed({ get: () => props.tile.visualizer.data.color2, set: (c) => props.tile.visualizer.data.color2 = c });
const colorSync1B = computed({ get: () => colorPicker1.colorData, set: (c) => colorPicker1.colorData = c });
const colorSync2B = computed({ get: () => colorPicker2.colorData, set: (c) => colorPicker2.colorData = c });
syncRef(colorSync1A, colorSync1B);
syncRef(colorSync2A, colorSync2B);
</script>

<template>
    <BaseTile :tile="props.tile" :options-window="{ minWidth: 500 }">
        <template v-slot:content>
            <div ref="canvasWrapper"></div>
            <div class="visualizerUploadCover" v-if="props.tile.visualizer.data.buffer === null">
                <input type="button" class="uploadButton" @click="uploadSource" value="Upload source audio" :disabled="uploadSourceDisabled">
            </div>
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <label title="Audio source file">
                    <input type="button" class="uploadButton" @click="uploadSource" :value="props.tile.visualizer.data.buffer === null ? 'Upload source' : 'Replace source'" :disabled="uploadSourceDisabled">
                </label>
                <label title="Volume (gain) of tile - affects visualizer and output">
                    Gain:
                    <Slider length="100px" v-model="props.tile.visualizer.data.gain" :min="0" :max="1.2" :step="0.01" :title="`Volume: ${props.tile.visualizer.data.gain * 100}%`"></Slider>
                </label>
                <label title="Mute - does not affect visualizer, only output">
                    Mute:
                    <Toggle v-model="props.tile.visualizer.data.mute"></Toggle>
                </label>
                <label title="Relative size of tile to sibling tiles">
                    Size:
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
                </label>
                <br>
                <label title="Background color of tile">
                    Background:
                    <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
                </label>
            </TileOptionsSection>
            <TileOptionsSection title="Style">
                <label title="Visualizer drawing style">
                    Mode:
                    <select v-model="props.tile.visualizer.data.mode">
                        <option :value="VisualizerMode.FREQ_BAR">Freq (Bar)</option>
                        <option :value="VisualizerMode.FREQ_LINE">Freq (Line)</option>
                        <option :value="VisualizerMode.FREQ_FILL">Freq (Fill)</option>
                        <option :value="VisualizerMode.FREQ_LUMINANCE">Freq (Lumi)</option>
                        <option :value="VisualizerMode.WAVE_DIRECT">Wave (Direct)</option>
                        <option :value="VisualizerMode.WAVE_CORRELATED">Wave (Corr)</option>
                        <option :value="VisualizerMode.SPECTROGRAM">Spectrogram</option>
                        <option :value="VisualizerMode.CHANNEL_LEVELS">Channel Levels</option>
                    </select>
                </label>
                <label title="Visualizer color pallete">
                    Colors:
                    <span>
                        <EnhancedColorPicker :picker="colorPicker1"></EnhancedColorPicker>
                    </span>
                    <span style="margin-left: 8px;">
                        <EnhancedColorPicker :picker="colorPicker2"></EnhancedColorPicker>
                    </span>
                </label>
                <label title="Apply additional opacity to secondary color">
                    A:
                    <StrictNumberInput v-model="props.tile.visualizer.data.color2Alpha" :min="0" :max="1" :step="0.01"></StrictNumberInput>
                </label>
                <label title="Apply color pallete using alternative style">
                    Alt Colors:
                    <Toggle v-model="props.tile.visualizer.data.altColorMode"></Toggle>
                </label>
                <label title="Rotate the visualizer vertically">
                    Rotate:
                    <Toggle v-model="props.tile.visualizer.data.rotate"></Toggle>
                </label>
                <label title="Flip the visualizer horizontally, after rotating">
                    Flip X:
                    <Toggle v-model="props.tile.visualizer.data.flipX"></Toggle>
                </label>
                <label title="Flip the visualizer vertically, after rotating">
                    Flip Y:
                    <Toggle v-model="props.tile.visualizer.data.flipY"></Toggle>
                </label>
            </TileOptionsSection>
            <TileOptionsSection title="This is totally usable">
                this is totally usabel
            </TileOptionsSection>
        </template>
    </BaseTile>
</template>

<style>
.visualizerCanvas {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: transparent;
}
</style>
<style scoped>
.visualizerUploadCover {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: black;
    align-items: center;
    justify-content: center;
}

.uploadButton {
    grid-column: span 2;
    background-color: dodgerblue;
}

.uploadButton:hover {
    background-color: color-mix(in hsl, dodgerblue 80%, cyan 20%);
}

.uploadButton:disabled {
    background-color: gray;
}
</style>