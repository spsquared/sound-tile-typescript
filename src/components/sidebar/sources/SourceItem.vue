<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import TileEditor from '@/visualizer/editor';
import MediaPlayer from '@/visualizer/mediaPlayer';
import { VisualizerTile } from '@/visualizer/tiles';
import Slider from '@/components/inputs/Slider.vue';

const props = defineProps<{
    sourceKey: string // literally useless here, only used in parent to not pause this when playing
    playPreview: (t: number) => void
    pausePreview: () => void
    tiles: Set<VisualizerTile>
    previewDuration: number | undefined
}>();

// wow this is a lot more complicated than I remember it being... and yes it has to be this way
const playing = ref(false);
const startTime = ref(0);
const currentTime = ref(0);
const timeStr = computed(() => `${MediaPlayer.formatTime(currentTime.value)} / ${MediaPlayer.formatTime(props.previewDuration ?? 0)}`);
defineExpose({
    forcePause: () => playing.value = false
});
const seekTime = computed<number>({
    get: () => currentTime.value,
    set: (t) => {
        startTime.value = performance.now() / 1000 - t;
        currentTime.value = t;
        if (playing.value) props.playPreview(currentTime.value);
    }
});
watch(playing, () => {
    if (playing.value) props.playPreview(currentTime.value);
    else props.pausePreview();
});
let refreshInterval: NodeJS.Timeout = setInterval(() => {
    const now = performance.now() / 1000;
    if (playing.value) {
        currentTime.value = now - startTime.value;
        if (currentTime.value >= (props.previewDuration ?? 0)) seekTime.value = 0;
    } else {
        startTime.value = now - currentTime.value;
    }
}, 50);
onBeforeUnmount(() => clearInterval(refreshInterval));

const idThing = 'previewPlay' + performance.now() + Math.random();

function setIdentifyTile(tile: VisualizerTile, v: boolean) {
    if (v) TileEditor.state.identifyTilesSidebar.add(tile);
    else TileEditor.state.identifyTilesSidebar.delete(tile);
}
</script>

<template>
    <div class="sourceItem">
        <div class="preview">
            <input type="checkbox" :id="idThing" class="previewPlayCheckbox" v-model="playing"></input>
            <label button class="previewPlayButton" :for="idThing" v-if="props.previewDuration !== undefined" :title="playing ? 'Pause preview' : 'Play preview'" tabindex="0"></label>
            <div class="previewLoadingStandin" v-else></div>
            <Slider class="previewSeekSlider" v-model="seekTime" :title="timeStr" :min="0" :max="props.previewDuration ?? 0" :step="0.01" length="100%" track-width="40px" thumb-width="40px" thumb-length="16px" thumb-radius="0px" color2="#555" color3="#DDD" color4="#EEE" side-border-width="0px" end-border-width="0px"></Slider>
            <div class="previewTimeDisplay" :title="timeStr">{{ MediaPlayer.formatTime(currentTime) }}</div>
        </div>
        <template v-for="tile in props.tiles">
            <div class="tileLink" @mouseenter="setIdentifyTile(tile, true)" @mouseleave="setIdentifyTile(tile, false)">{{ tile.label }}</div>
            <div class="tileLinkDivider"></div>
        </template>
    </div>
</template>

<style scoped>
.sourceItem {
    display: flex;
    flex-direction: column;
    row-gap: 2px;
    margin-bottom: 8px;
    padding: 8px 8px;
    background-color: #222;
}

.sourceItem:hover {
    background-color: #333;
}

.preview {
    display: grid;
    grid-template-columns: 40px 1fr 60px;
    column-gap: 2px;
    border: 2px solid white;
    margin-bottom: 6px;
    background-color: white;
}

.previewPlayButton {
    grid-row: 1;
    grid-column: 1;
    border-radius: 0px;
    background-color: #A00;
    background-image: url(@/img/play.svg);
    background-position: center;
    background-size: 50% 50%;
    background-repeat: no-repeat;
}

.previewPlayButton:hover {
    background-color: #C00;
}

.previewPlayCheckbox {
    display: none;
}

.previewPlayCheckbox:checked+.previewPlayButton {
    background-color: #080;
    background-image: url(@/img/pause.svg);
}

.previewPlayCheckbox:checked+.previewPlayButton:hover {
    background-color: #0A0;
}

.previewLoadingStandin {
    grid-row: 1;
    grid-column: 1;
    position: relative;
    background-color: #555;
    cursor: not-allowed;
}

.previewLoadingStandin::before,
.previewLoadingStandin::after {
    content: ' ';
    display: block;
    position: absolute;
    top: 4px;
    left: 4px;
    width: 16px;
    height: 16px;
    animation: previewLoadingSpinner 1000ms cubic-bezier(0.7, 0, 0.8, 0.5) infinite;
    background-color: white;
    box-shadow: 0px 0px 2px 0px #FFFA;
}

.previewLoadingStandin::after {
    animation-delay: -625ms;
}

@keyframes previewLoadingSpinner {
    0% {
        transform: translate(0px, 0px);
    }

    25% {
        transform: translate(16px, 0px);
    }

    50% {
        transform: translate(16px, 16px);
    }

    75% {
        transform: translate(0px, 16px);
    }
}

.previewSeekSlider {
    grid-row: 1;
    grid-column: 2;
    max-width: 100%;
}

.previewTimeDisplay {
    grid-row: 1;
    grid-column: 3;
    align-content: center;
    text-align: center;
    background-color: black;
}

.tileLink {
    border-radius: 8px;
    padding: 0px 24px;
}

.tileLink:hover {
    background-color: #555;
}

.tileLinkDivider {
    height: 2px;
    margin: 0px 16px;
    background-color: #555;
}
</style>