<script setup lang="ts">
import { computed, ComputedRef, inject, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue';
import { useElementSize, useThrottleFn } from '@vueuse/core';
import { useSortable } from '@vueuse/integrations/useSortable';
import FileAccess from '@/components/inputs/fileAccess';
import ErrorQueue from '@/errorQueue';
import TileEditor from '../editor';
import { BeepboxTile } from '../tiles';
import BeepboxVisualizer from '../beepbox';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Slider from '@/components/inputs/Slider.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import ColorPicker from '@/components/inputs/colorPicker';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import pianoIcon from '@/img/piano-keys.svg';
import rotateIcon from '@/img/rotate-dark.svg';
import flipHorizontalIcon from '@/img/flip-horizontal-dark.svg';
import flipVerticalIcon from '@/img/flip-vertical-dark.svg';

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

const channelStyles = useTemplateRef('channelStyles');
useSortable(channelStyles, options.value.channelStyles, {
    animation: 100,
    handle: '.channelItemDragHandle',
});
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 500, minHeight: 300, resizeable: true }">
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
                        <label title="Set the number of times the looped part of the song plays (1 being play once)">
                            Loop count
                            <StrictNumberInput v-model="options.loopCount" :min="1" :step="1"></StrictNumberInput>
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
                    <div class="optionsTable">
                        <label title="Enable the piano keyboard">
                            Show Piano Keys
                            <Toggle v-model="options.piano.enabled" :icon="pianoIcon"></Toggle>
                        </label>
                        <label title="Controls the playhead position in the tile, or the proportion of space where past notes are shown past the playhead">
                            Playhead Pos
                            <span>
                                <Slider length="100px" v-model="options.playheadPosition" :min="0" :max="1" :step="0.01" :scroll-speed="0.05" :title="`Playhead position: ${Math.round(options.playheadPosition * 100)}%`"></Slider>
                                {{ Math.round(options.playheadPosition * 100) }}%
                            </span>
                        </label>
                        <label title="Hide beats and measures skipped by &quot;Next Bar&quot; modulations">
                            Hide Skipped Bars
                            <Toggle v-model="options.cutSkippedBeats"></Toggle>
                        </label>
                    </div>
                    <div class="optionsGrid">
                        <label title="Rotate the piano roll vertically">
                            Vertical
                            <Toggle v-model="options.rotate" :icon="rotateIcon"></Toggle>
                        </label>
                        <label title="Flip the piano roll horizontally, after rotating">
                            Flip X
                            <Toggle v-model="options.flipX" :icon="flipHorizontalIcon"></Toggle>
                        </label>
                        <label title="Flip the piano roll vertically, after rotating">
                            Flip Y
                            <Toggle v-model="options.flipY" :icon="flipVerticalIcon"></Toggle>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Channel Styles" v-show="options.song !== null">
                <div class="channelRows" ref="channelStyles">
                    <div class="channelItem" v-for="channel in options.channelStyles" :key="channel.index">
                        <div class="channelItemDragHandle"></div>
                        <div class="channelItemLabel">{{ options.song?.channels[channel.index].name }}</div>

                        {{ channel.instruments.length }}
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Piano Keyboard" v-show="options.piano.enabled">
                <div class="optionsRows">
                    <div class="optionsGrid">

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
@import url(./options/shared.css);

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

.channelRows {
    display: flex;
    flex-direction: column;
    width: 100%;
    row-gap: 4px;
}

.channelItem {
    display: flex;
    flex-direction: row;
    border: 2px solid #333;
    border-radius: 2px;
}

.channelItemDragHandle {
    width: 24px;
    background-image: url(@/img/drag-vertical.svg);
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    cursor: move;
}

.channelItemLabel {
    margin-right: 8px;
}

.channelItem:hover {
    border-color: #555;
}
</style>