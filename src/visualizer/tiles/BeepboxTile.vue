<script setup lang="ts">
import { computed, ComputedRef, inject, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { useElementSize, useThrottleFn } from '@vueuse/core';
import FileAccess from '@/components/inputs/fileAccess';
import ErrorQueue from '@/errorQueue';
import TileEditor from '../editor';
import { BeepboxTile } from '../tiles';
import BeepboxVisualizer from '../beepbox';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';

const props = defineProps<{
    tile: BeepboxTile
}>();
const options = computed(() => props.tile.visualizer.data);

const wrapper = useTemplateRef('canvasWrapper');
onMounted(() => {
    wrapper.value?.appendChild(props.tile.canvas);
});
props.tile.canvas.classList.add('visualizerCanvas');

const { width: canvasWidth, height: canvasHeight } = useElementSize(wrapper);
const onResize = useThrottleFn(() => {
    props.tile.visualizer.resize(canvasWidth.value * window.devicePixelRatio, canvasHeight.value * window.devicePixelRatio);
}, 50, true, true);
watch([canvasWidth, canvasHeight], onResize);
onMounted(() => window.addEventListener('resize', onResize, { passive: true }));
onUnmounted(() => window.removeEventListener('resize', onResize));

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));

const uploadJsonDisabled = ref(false);
async function uploadJson() {
    uploadJsonDisabled.value = true;
    const source = await FileAccess.openFilePicker({
        id: 'soundtileUploadSource',
        types: [{
            accept: {
                'application/json': ['.json']
            }
        }]
    });
    if (source.length > 0) {
        try {
            const json = JSON.parse(await source[0].text());
            options.value.song = BeepboxVisualizer.parseRawJSON(json);
        } catch (err) {
            ErrorQueue.error(`${err}\nPerhaps the JSON isn't a BeepBox song?`, 'Could not load song');
        }
    }
    uploadJsonDisabled.value = false;
}
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template #content>
            <div class="canvasWrapper" ref="canvasWrapper"></div>
            <div class="beepboxUploadCover" v-if="options.song === null">
                <input type="button" class="uploadButton" @click="uploadJson" value="Upload JSON song data" title="Upload a JSON export of your BeepBox project" :disabled="uploadJsonDisabled || TileEditor.lock.locked">
            </div>
        </template>
        <template #options>
            <TileOptionsSection title="General">
                <div class="optionsRows">
                    <div>
                        <input type="button" class="uploadButton" @click="uploadJson" :value="options.song === null ? 'Upload JSON song data' : 'Replace song data'" :title="`${options.song === null ? 'Upload a' : 'Replace the'} BeepBox song data (exported in JSON format)`" :disabled="uploadJsonDisabled || TileEditor.lock.locked">
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
            <TileOptionsSection title="Colors">
                <div class="optionsGrid">
                    <label title="Background style of tile">
                        Background
                        <EnhancedColorPicker :picker="props.tile.backgroundColor" :disabled="inCollapsedGroup"></EnhancedColorPicker>
                    </label>
                </div>
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style>
.beepboxCanvas {
    width: 100%;
    height: 100%;
}
</style>
<style scoped>
.canvasWrapper {
    width: 100%;
    height: 100%;
}

.beepboxUploadCover {
    display: flex;
    flex-direction: column;
    row-gap: 4px;
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
    flex-wrap: wrap;
    column-gap: 12px;
    row-gap: 4px;
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
</style>