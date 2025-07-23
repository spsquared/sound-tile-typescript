<script setup lang="ts">
import { ref } from 'vue';
import FullscreenModal, { ModalMode } from '../FullscreenModal.vue';
import TileEditor from '@/visualizer/editor';
import { Media } from '@/visualizer/media';
import MediaPlayer from '@/visualizer/mediaPlayer';
import FileAccess from '../inputs/fileAccess';

// these file controls operate directly on the tile editor by setting the current media player session
const errorMessageType = ref(false);
const errorModalOpen = ref(false);
async function uploadToCurrent() {
    if (TileEditor.state.lock.locked) return;
    await TileEditor.state.lock.acquire();
    const files = await FileAccess.openFilePicker({
        id: 'soundtileUploadTilesCurrent',
        types: [{
            description: 'Sound Tile Layouts',
            accept: {
                'application/octet-stream': ['.soundtile']
            }
        }],
        excludeAcceptAllOption: true
    });
    if (files.length == 1) {
        const media = await Media.decompress(files[0]);
        if (media === null) {
            errorMessageType.value = false;
            errorModalOpen.value = true;
            TileEditor.state.lock.release();
            return;
        }
        MediaPlayer.state.current = media;
    }
    TileEditor.state.lock.release();
}
async function downloadFromCurrent() {
    if (TileEditor.state.lock.locked) return;
    await TileEditor.state.lock.acquire();
    const buffer = await MediaPlayer.state.current.compress();
    if (buffer === null) {
        errorMessageType.value = true;
        errorModalOpen.value = true;
        TileEditor.state.lock.release();
        return;
    }
    const file = new Blob([buffer], { type: 'application/octet-stream' });
    const current = new Date();
    await FileAccess.saveFilePicker({
        id: 'soundtileDownloadTiles',
        excludeAcceptAllOption: true,
        types: [{
            description: 'Sound Tile Layouts',
            accept: {
                'application/octet-stream': ['.soundtile']
            }
        }],
        suggestedName: `${current.getHours()}-${current.getMinutes()}_${current.getMonth()}-${current.getDay()}-${current.getFullYear()}.soundtile`
    }, file)
    TileEditor.state.lock.release();
}
</script>

<template>
    <div id="fileControls">
        <input type="button" id="tileUpload" title="Load Tiles from computer" @click="uploadToCurrent" :disabled="TileEditor.state.lock.locked">
        <input type="button" id="tileDownload" title="Save Tiles to computer" @click="downloadFromCurrent" :disabled="TileEditor.state.lock.locked">
    </div>
    <FullscreenModal v-model="errorModalOpen" :title="errorMessageType ? 'Failed to save layout' : 'Failed to load layout'" :mode="ModalMode.NOTIFY" color="red">
        The Sound Tiles failed to {{ errorMessageType ? 'save' : 'load' }}.
        <span v-if="!errorMessageType">
            <br>
            Perhaps this file was made in a newer version of Sound Tile or is corrupted?
        </span>
    </FullscreenModal>
</template>

<style scoped>
#fileControls {
    position: relative;
    display: grid;
    grid-template-columns: 58px;
    grid-template-rows: 58px 4px 48px;
    border-left: 4px solid white;
}

#fileControls>input {
    box-sizing: content-box;
    appearance: none;
    width: 58px;
    height: 58px;
    margin: 0px;
    padding: 0px;
    border-radius: 0px;
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    outline-offset: -2px;
    outline-color: black;
}

#tileUpload {
    grid-row: 1;
    background-image: url(@/img/upload.svg);
}

#tileUpload::-webkit-file-upload-button {
    visibility: hidden;
}

#tileDownload {
    grid-row: 3;
    background-image: url(@/img/download.svg);
}

#fileControls::after {
    content: '';
    grid-row: 2;
    height: 4px;
    background-color: white;
    pointer-events: none;
}
</style>