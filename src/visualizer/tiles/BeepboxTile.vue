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

const channelList = useTemplateRef('channelList');
useSortable(channelList, options.value.channelStyles, {
    animation: 100,
    handle: '.channelListItemDragHandle',
    watchElement: true, // the list can be unrendered when there's no song data
    bubbleScroll: true,
});

const selectedChannel = ref(0);
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 500, minHeight: 400, resizeable: true }">
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
                            <StrictNumberInput v-model="options.loopCount" :min="1" :step="1" style="width: 100px"></StrictNumberInput>
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
                <div class="optionsTable optionsTableColumns">
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
                    <div class="optionsTable">
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
            <TileOptionsSection title="Channel Styles" v-if="options.song !== null">
                <div class="channelSplitPane">
                    <div class="channelList" ref="channelList">
                        <div :class="{
                            channelListItem: true,
                            channelListItemSelected: selectedChannel == channel.index
                        }" v-for="channel in options.channelStyles" :key="channel.index" @click="selectedChannel = channel.index">
                            <div class="channelListItemDragHandle" title="Drag to reorder channel drawing order"></div>
                            <div class="channelListItemLabel">{{ options.song.channels[channel.index].name }}</div>
                        </div>
                    </div>
                    <div class="channelEdit">
                        <TransitionGroup name="channel">
                            <div class="channelEditItem" v-for="channel in options.channelStyles" :key="channel.index" v-show="selectedChannel == channel.index">
                                <div class="instrumentItem">
                                    <div class="instrumentTitle">{{ options.song.channels[channel.index].name }}</div>
                                    <div class="optionsTable">
                                        <label title="Allow each instrument to have a different style">
                                            Separate<br>Instr. Styles
                                            <Toggle v-model="channel.separateInstrumentStyles"></Toggle>
                                        </label>
                                    </div>
                                </div>
                                <div class="instrumentItem" v-for="instrument, i in channel.separateInstrumentStyles ? channel.instruments : [channel.instruments[0]]">
                                    <div class="instrumentTitle" v-if="channel.separateInstrumentStyles">Instrument {{ i + 1 }} ({{ options.song.channels[channel.index].instruments[i].type }})</div>
                                    <div class="instrumentTitle" v-else>Instruments</div>
                                    <div class="optionsRows">
                                        <div class="optionsGrid" style="justify-content: center;">
                                            <label title="Note foreground color">
                                                Note FG
                                                <EnhancedColorPicker v-model="instrument.noteColor"></EnhancedColorPicker>
                                            </label>
                                            <label title="Note background color">
                                                Note BG
                                                <EnhancedColorPicker v-model="instrument.noteBackground"></EnhancedColorPicker>
                                            </label>
                                        </div>
                                        <div class="optionsTable">
                                            <label title="Apply gradients: individually per note; across the entire tile; as solid colors sampled from the gradient based on pitch">
                                                Gradient Mode
                                                <select v-model="instrument.gradientMode">
                                                    <option value="note">Notes</option>
                                                    <option value="canvas">Tile</option>
                                                    <option value="pitch">Pitch</option>
                                                </select>
                                            </label>
                                            <label title="Scale notes BeepBox-style with their note size pins">
                                                Note Size
                                                <Toggle v-model="instrument.noteSizeEnabled"></Toggle>
                                            </label>
                                            <label title="Render instrument vibrato in the piano roll as &nbsp;squiggling&nbsp;">
                                                Vibrato
                                                <Toggle v-model="instrument.showVibrato"></Toggle>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TransitionGroup>
                        <div class="channelEditBorder"></div>
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
                        <EnhancedColorPicker :picker="props.tile.backgroundColor" badge-width="60px" :disabled="inCollapsedGroup"></EnhancedColorPicker>
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

.channelSplitPane {
    display: flex;
    flex-direction: row;
    column-gap: 8px;
    width: 100%;
    height: 280px;
}

.channelList {
    display: flex;
    flex-direction: column;
    max-width: min(40%, 260px);
    padding-right: 4px;
    row-gap: 4px;
    flex-grow: 1;
    overflow-y: scroll;
    --scrollbar-size: 8px;
}

.channelListItem {
    display: flex;
    flex-direction: row;
    border: 2px solid #333;
    border-radius: 2px;
    transition: 50ms linear background-color;
    cursor: pointer;
}

.channelListItemDragHandle {
    width: 24px;
    background-image: url(@/img/drag-vertical.svg);
    background-position: center;
    background-size: 20px 20px;
    background-repeat: no-repeat;
    cursor: move;
}

.channelListItemLabel {
    margin-right: 8px;
    flex-shrink: 1;
    text-wrap: nowrap;
    text-overflow: ellipsis;
}

.channelListItem:hover {
    border-color: #555;
}

.channelListItemSelected {
    border-color: white !important;
    background-color: #FFF3;
    cursor: default;
}

.channelEdit {
    position: relative;
    padding-right: 4px;
    flex-grow: 1;
    overflow-x: hidden;
    overflow-y: scroll;
    --scrollbar-size: 8px;
}

.channelEditBorder {
    box-sizing: border-box;
    position: sticky;
    top: 0px;
    width: 100%;
    height: 100%;
    border: 2px solid #555;
    border-radius: 2px;
    pointer-events: none;
    /* render above titles */
    z-index: 2;
}

.channelEditItem {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    padding: 6px 10px 6px 6px;
    width: 100%;
}

.instrumentItem {
    padding: 0px 2px;
}

.instrumentTitle {
    position: sticky;
    /* hide leaks at top buh */
    top: 1.5px;
    width: 100%;
    padding: 0px 2px;
    border-bottom: 4px solid #555;
    background-image: linear-gradient(0deg, #333A 0%, #222 80%);
    backdrop-filter: blur(1px);
    transform: translateX(-2px);
    text-align: center;
    /**Render above everything else */
    z-index: 1;
}

/* animations */

.channel-enter-active,
.channel-leave-active {
    transition: 200ms ease transform;
}

.channel-enter-from {
    transform: translateX(100%);
}

.channel-leave-to {
    transform: translateX(-100%);
}

.channel-enter-to,
.channel-leave-from {
    transform: translateX(0px);
}
</style>