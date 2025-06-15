<script setup lang="ts">
import { throttledWatch, useElementSize } from '@vueuse/core';
import { VisualizerTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import Slider from '@/components/inputs/Slider.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import { openFilePicker } from '@/components/inputs/fileAccess';

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
    props.tile.visualizer.renderer.resize(canvasWidth.value * devicePixelRatio, canvasHeight.value * devicePixelRatio);
}, { throttle: 20 });

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
    if (source.length == 0) return;
    const buffer = await source[0].arrayBuffer();
    props.tile.visualizer.data.buffer = buffer;
    uploadSourceDisabled.value = false;
}
</script>

<template>
    <BaseTile :tile="props.tile" :options-window="{ minWidth: 500 }">
        <template v-slot:content>
            <div ref="canvasWrapper"></div>
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General" :columns="3">
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
                <label title="Background color of tile">
                    BG:
                    <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
                </label>
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