<script setup lang="ts">
import { Ref, ref } from 'vue';
import MediaPlayer from '@/visualizer/mediaPlayer';

const coverArt: Ref<HTMLImageElement | null> = ref(null);
const title: Ref<HTMLInputElement | null> = ref(null);
const subtitle: Ref<HTMLInputElement | null> = ref(null);

const open = ref(false);

function uploadCoverArt() {

}
</script>

<template>
    <input type="checkbox" id="mdatTabCheckbox">
    <div id="mdatControls">
        <div id="mdatBody">
            <img id="mdatCoverArt" ref="coverArt" :src="MediaPlayer.state.current.coverArt" @dblclick="uploadCoverArt()" title="Album cover (double-click to change)">
            <input id="mdatTitle" ref="title" type="text" v-model="MediaPlayer.state.current.title" placeholder="Title" autocomplete="off" spellcheck="false">
            <input id="mdatSubtitle" ref="subtitle" type="text" v-model="MediaPlayer.state.current.subtitle" placeholder="Artist - Album" autocomplete="off" spellcheck="false">
            <div id="mdatPlaylist">
                <div id="mdatPlaylistOptions">
                    <input id="mdatPlaylistShuffleToggle" type="checkbox" v-model="MediaPlayer.state.shuffle">
                    <label id="mdatPlaylistShuffleLabel" for="mdatPlaylistShuffleToggle" title="Shuffle playlist"></label>
                    <input id="mdatPlaylistLoopToggle" type="checkbox" v-model="MediaPlayer.state.loop">
                    <label id="mdatPlaylistLoopLabel" for="mdatPlaylistLoopToggle" title="Loop song"></label>
                </div>
                <div id="mdatPlaylistNextup"></div>
                <div id="mdatPlaylistItems">
                </div>
                <!-- <input id="mdatPlaylistAddButton" type="button" value="+" title="Upload more Tiles to add to playlist"> -->
            </div>
        </div>
        <label id="mdatTab" for="mdatTabCheckbox" :title="open ? 'Show media metadata' : 'Hide media metadata'"></label>
    </div>
</template>

<style scoped>
#mdatControls {
    display: flex;
    border-left: 4px solid white;
}

#mdatTabCheckbox {
    display: none;
}

#mdatBody {
    display: grid;
    grid-template-rows: 26px 24px 70px;
    grid-template-columns: 124px 192px;
    max-width: 0px;
    width: 320px;
    flex-grow: 1;
    transition: 400ms ease max-width;
    overflow-x: clip;
    overflow-y: visible;
}

#mdatTab {
    width: 24px;
    border-left: 4px solid white;
    margin-left: -4px;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 80% 80%;
    background-image: url(@/img/arrow-right.svg);
    cursor: pointer;
}

#mdatTabCheckbox:checked~#mdatControls #mdatBody {
    max-width: 320px;
}

#mdatTabCheckbox:checked~#mdatControls #mdatTab {
    background-image: url(@/img/arrow-left.svg);
}

#mdatCoverArt {
    grid-row: 1 / 4;
    grid-column: 1;
    width: 120px;
    height: 120px;
    border-right: 4px solid white;
}

#mdatTitle,
#mdatSubtitle {
    width: 100%;
    margin: 0px 0px;
    padding: 0px 4px;
    background-color: transparent;
    border: none;
    box-sizing: border-box;
    font-family: 'Source Code Pro', Courier, monospace;
}

#mdatTitle:focus-visible,
#mdatSubtitle:focus-visible {
    appearance: none;
    background-color: #222;
}

#mdatTitle {
    height: 24px;
    margin-top: 2px;
    font-size: 18px;
    color: white;
}

#mdatSubtitle {
    height: 20px;
    margin-bottom: 2px;
    font-size: 14px;
    color: #EEE;
}

#mdatPlaylist {
    grid-row: 3;
    grid-column: 2;
    margin: -4px -4px;
    max-height: 70px;
    height: 200px;
    transition: 300ms ease max-height;
    border: 4px solid white;
    background-color: black;
    overflow-y: scroll;
}

#mdatPlaylist:hover {
    max-height: 200px;
}

#mdatPlaylist::-webkit-scrollbar-thumb {
    border-radius: 4px;
}

#mdatPlaylistOptions {
    display: flex;
    flex-direction: row;
    justify-content: space-evenly;
    height: 28px;
}

#mdatPlaylistShuffleToggle,
#mdatPlaylistLoopToggle {
    display: none;
}

#mdatPlaylistShuffleLabel,
#mdatPlaylistLoopLabel {
    width: 28px;
    height: 100%;
    border: none;
    background-color: transparent;
    background-position: center;
    background-repeat: no-repeat;
    background-size: 80% 80%;
    opacity: 0.3;
    transition: 50ms linear opacity;
    cursor: pointer;
}

#mdatPlaylistShuffleLabel {
    background-size: 90% 90%;
    background-image: url(@/img/shuffle.svg);
}

#mdatPlaylistLoopLabel {
    background-image: url(@/img/loop.svg);
}

#mdatPlaylistShuffleLabel:hover,
#mdatPlaylistLoopLabel:hover {
    opacity: 0.6;
}

#mdatPlaylistShuffleToggle:checked~#mdatPlaylistShuffleLabel,
#mdatPlaylistLoopToggle:checked~#mdatPlaylistLoopLabel {
    opacity: 1;
}

#mdatPlaylist {
    --scrollbar-size: 8px;
    --scrollbar-padding: 0px;
}
</style>