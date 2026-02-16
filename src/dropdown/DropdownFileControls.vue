<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import TileEditor from '@/visualizer/editor';
import Media from '@/visualizer/media';
import MediaPlayer from '@/visualizer/mediaPlayer';
import FileAccess from '@/components/inputs/fileAccess';
import { matchTextInput } from '@/constants';

// these file controls operate directly on the tile editor by setting the current media player session
async function uploadToCurrent() {
    if (TileEditor.lock.locked) return;
    await TileEditor.lock.acquire();
    const files = await FileAccess.openFilePicker({
        id: 'soundtileUploadTilesCurrent',
        types: [{
            description: 'Sound Tile Layouts',
            accept: {
                'application/x-soundtile': ['.soundtile']
            }
        }],
        excludeAcceptAllOption: true
    });
    if (files.length == 1) {
        const media = await Media.decompress(files[0]);
        if (media === null) {
            TileEditor.lock.release();
            console.error('Failed to decompress media from uploaded file');
            return;
        }
        MediaPlayer.media.current.destroy(); // beware resource leak
        MediaPlayer.media.current = media;
    }
    TileEditor.lock.release();
}
async function downloadFromCurrent() {
    if (TileEditor.lock.locked) return;
    await TileEditor.lock.acquire();
    const buffer = await MediaPlayer.media.current.compress();
    if (buffer === null) {
        TileEditor.lock.release();
        console.error('Failed to compress media for download');
        return;
    }
    const file = new Blob([buffer], { type: 'application/x-soundtile' });
    const current = new Date();
    await FileAccess.saveFilePicker({
        id: 'soundtileDownloadTiles',
        excludeAcceptAllOption: true,
        types: [{
            description: 'Sound Tile Layouts',
            accept: {
                'application/x-soundtile': ['.soundtile']
            }
        }],
        suggestedName: `${current.getHours()}-${current.getMinutes()}_${current.getMonth()}-${current.getDay()}-${current.getFullYear()}.soundtile`
    }, file);
    TileEditor.lock.release();
}

const dragHovering = ref(false);
function dragover(e: DragEvent) {
    if (e.dataTransfer !== null) {
        e.preventDefault();
        dragHovering.value = true;
    }
}
function dragend() {
    dragHovering.value = false;
}
async function drop(e: DragEvent) {
    dragHovering.value = false;
    if (e.dataTransfer !== null && e.dataTransfer.files.length == 1) {
        e.preventDefault();
        if (TileEditor.lock.locked) return;
        await TileEditor.lock.acquire();
        const media = await Media.decompress(e.dataTransfer.files.item(0)!);
        if (media === null) {
            TileEditor.lock.release();
            console.error('Failed to decompress media from uploaded file');
            return;
        }
        MediaPlayer.media.current.destroy(); // beware resource leak
        MediaPlayer.media.current = media;
        TileEditor.lock.release();
    }
}

function keydown(e: KeyboardEvent) {
    if (matchTextInput(e.target)) return;
    const key = e.key.toLowerCase();
    if (key == 'o' && e.ctrlKey && !e.metaKey && !e.altKey) {
        uploadToCurrent();
    } else if (key == 's' && e.ctrlKey && !e.metaKey && !e.altKey) {
        downloadFromCurrent();
    }
}
onMounted(() => document.addEventListener('keydown', keydown, { passive: true }));
onUnmounted(() => document.removeEventListener('keydown', keydown));
</script>

<template>
    <div id="fileControls" @dragover="dragover" @dragleave="dragend" @dragend="dragend" @drop="drop">
        <input type="button" id="tileUpload" title="Load Tiles from computer" @click="uploadToCurrent" :disabled="TileEditor.lock.locked" :style="{ backgroundColor: dragHovering ? 'dodgerblue' : undefined }">
        <input type="button" id="tileDownload" title="Save Tiles to computer" @click="downloadFromCurrent" :disabled="TileEditor.lock.locked">
    </div>
</template>

<style scoped>
#fileControls {
    position: relative;
    display: grid;
    grid-template-rows: 58px 4px 48px;
    grid-template-columns: 58px;
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
    outline-offset: -4px;
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