<script setup lang="ts">
import Slider from '#/inputs/Slider.vue';
import Toggle from '../inputs/Toggle.vue';
import volumeIcon from '@/img/volume.svg';
import loopIcon from '@/img/loop-dark.svg';
import MediaPlayer from '@/visualizer/mediaPlayer';
import { pipEnabled } from '@/visualizer/pipPlayer';

</script>

<template>
    <div id="mediaControls">
        <Slider id="volumeSlider" ref="volume" v-model="MediaPlayer.state.volume" :min="0" :max="150" :step="1" vertical length="120px" track-width="10px" thumb-length="15px" thumb-width="30px" side-border-width="2px" end-border-width="0px" :icon="volumeIcon"></Slider>
        <Slider id="seekSlider" ref="seek" track-width="58px" thumb-length="20px" thumb-width="58px" thumb-radius="0px" color2="#555" color3="#DDD" color4="#EEE" side-border-width="0px" end-border-width="0px"></Slider>
        <div id="mediaControlsBorder1"></div>
        <div id="mediaControlsBorder2"></div>
        <input type="checkbox" id="playCheckbox">
        <label button id="playButton" for="playCheckbox"></label>
        <div id="mediaControlsTimeContainer">
            <span>{{ '0:00' }}</span>
            <Toggle v-model="MediaPlayer.state.loop" :icon="loopIcon"></Toggle>
        </div>
        <input type="checkbox" id="pipCheckbox" :disabled="!pipEnabled">
        <label button id="pipButton" for="pipCheckbox" :disabled="!pipEnabled"></label>
    </div>
</template>

<style scoped>
#mediaControls {
    display: grid;
    grid-template-columns: 50px 4px 58px 66px 58px 1fr;
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
    grid-column: 3 / 7;
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
    grid-column: 3 / 7;
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

#pipCheckbox:checked+#pipButton {
    background-image: url(@/img/picture-in-picture-exit.svg);
}

#pipCheckbox:disabled+#pipButton {
    background-color: gray;
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