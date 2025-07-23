<script setup lang="ts">
import Slider from '@/components/inputs/Slider.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import { matchTextInput } from '@/constants';
import volume0Icon from '@/img/volume0-dark.svg';
import volume1Icon from '@/img/volume1-dark.svg';
import volume2Icon from '@/img/volume2-dark.svg';
import loopIcon from '@/img/loop-dark.svg';
import MediaPlayer from '@/visualizer/mediaPlayer';
import { pipEnabled } from '@/visualizer/pipPlayer';
import { computed, onMounted, onUnmounted } from 'vue';

const volumeIcon = computed(() => MediaPlayer.state.volume > 0.75 ? volume2Icon : (MediaPlayer.state.volume > 0 ? volume1Icon : volume0Icon));

function keydown(e: KeyboardEvent) {
    if (matchTextInput(e.target)) return;
    const key = e.key.toLowerCase();
    if (key == ' ' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        MediaPlayer.playing.value = !MediaPlayer.playing.value;
        e.preventDefault();
    } else if (key == 'arrowleft' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        MediaPlayer.currentTime.value -= e.shiftKey ? 10 : 5;
        e.preventDefault();
    } else if (key == 'arrowright' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        MediaPlayer.currentTime.value += e.shiftKey ? 10 : 5;
        e.preventDefault();
    }
}
onMounted(() => document.addEventListener('keydown', keydown));
onUnmounted(() => document.removeEventListener('keydown', keydown));

const timeStr = computed(() => `${MediaPlayer.formatTime(MediaPlayer.currentTime.value)} / ${MediaPlayer.formatTime(MediaPlayer.currentDuration.value)}`);
</script>

<template>
    <div id="mediaControls">
        <Slider id="volumeSlider" v-model="MediaPlayer.state.volume" :title="`Volume: ${Math.round(MediaPlayer.state.volume * 100)}%`" :min="0" :max="1.5" :step="0.01" vertical length="120px" track-width="10px" thumb-length="15px" thumb-width="30px" side-border-width="2px" end-border-width="0px" :icon="volumeIcon"></Slider>
        <Slider id="seekSlider" v-model="MediaPlayer.currentTime.value" :title="timeStr" :min="0" :max="MediaPlayer.currentDuration.value" :step="0.01" track-width="58px" thumb-length="20px" thumb-width="58px" thumb-radius="0px" color2="#555" color3="#DDD" color4="#EEE" side-border-width="0px" end-border-width="0px"></Slider>
        <div id="mediaControlsBorder1"></div>
        <div id="mediaControlsBorder2"></div>
        <input type="checkbox" id="playCheckbox" v-model="MediaPlayer.playing.value">
        <label button id="playButton" for="playCheckbox" :title="MediaPlayer.playing.value ? 'Pause' : 'Play'"></label>
        <div id="mediaControlsTimeContainer">
            <span :title="timeStr">{{ MediaPlayer.formatTime(MediaPlayer.currentTime.value) }}</span>
            <Toggle v-model="MediaPlayer.state.loop" :icon="loopIcon" title="Loop song"></Toggle>
        </div>
        <input type="checkbox" id="pipCheckbox" :disabled="!pipEnabled">
        <label button id="pipButton" for="pipCheckbox" :disabled="!pipEnabled"></label>
        <div id="mediaControlsFullTimeContainer">
            <span>
                Time
                <br>
                {{ timeStr }}
            </span>
        </div>
    </div>
</template>

<style scoped>
#mediaControls {
    display: grid;
    grid-template-columns: 50px 4px 58px 66px 58px min-content 1fr;
    grid-template-rows: 58px 4px 58px;
    border-left: 4px solid white;
}

#volumeSlider {
    grid-row: 1 / 4;
    grid-column: 1;
    top: 0px;
    margin: 0px 10px;
}

#seekSlider {
    top: 0px;
    grid-row: 1;
    grid-column: 3 / 8;
    max-width: 100%;
}

#mediaControlsBorder1 {
    grid-column: 2;
    grid-row: 1 / 4;
    width: 4px;
    height: 100%;
    background-color: white;
}

#mediaControlsBorder2 {
    grid-column: 3 / 8;
    grid-row: 2;
    width: 100%;
    height: 4px;
    background-color: white;
}

#mediaControls>input,
#mediaControls>label {
    border-radius: 0px;
}

#playCheckbox {
    display: none;
}

#playButton {
    grid-row: 3;
    grid-column: 3;
    background-color: #A00;
    background-image: url(@/img/play.svg);
    background-position: center;
    background-size: 50% 50%;
    background-repeat: no-repeat;
}

#playButton:hover {
    background-color: #C00;
}

#playCheckbox:checked+#playButton {
    background-color: #080;
    background-image: url(@/img/pause.svg);
}

#playCheckbox:checked+#playButton:hover {
    background-color: #0A0;
}

#mediaControlsTimeContainer {
    display: flex;
    flex-direction: column;
    border-left: 4px solid white;
    border-right: 4px solid white;
    justify-content: center;
    align-items: center;
}

#mediaControlsTimeContainer>span {
    text-align: center;
    margin-bottom: 4px;
}

#pipCheckbox {
    display: none;
}

#pipButton {
    grid-row: 3;
    grid-column: 5;
    border-right: 4px solid white;
    margin-right: -4px;
    background-color: dodgerblue;
    background-image: url(@/img/picture-in-picture.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

#pipButton:hover {
    background-color: color-mix(in hsl, dodgerblue 80%, cyan 20%);
}

#pipCheckbox:checked+#pipButton {
    background-image: url(@/img/picture-in-picture-exit.svg);
}

#pipCheckbox:disabled+#pipButton {
    background-color: gray;
}

#mediaControlsFullTimeContainer {
    position: relative;
    grid-row: 3;
    grid-column: 7;
    overflow: hidden;
}

#mediaControlsFullTimeContainer>span {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    text-wrap: nowrap;
    text-align: center;
}
</style>
<style>
/* forced to invade other scopes, shouldn't break anything though */
#seekSlider,
#seekSlider>input {
    min-width: calc(58px * 3 + 4px * 2);
    transition: 500ms ease min-width;
}

#seekSlider:hover,
#seekSlider:hover>input {
    min-width: 360px;
}
</style>