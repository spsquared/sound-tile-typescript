<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { Tile } from '@/visualizer/tiles';

const props = defineProps<{
    tile: typeof Tile
}>();

function createTile(e: MouseEvent | TouchEvent) {
    if (TileEditor.drag.current === null) {
        TileEditor.startDrag(new props.tile(), { x: 100, y: 10 }, { w: 200, h: 150 }, e);
    }
}
</script>

<template>
    <div class="tilePreview" @mousedown="createTile" @touchstart.passive="createTile">
        <img class="tilePreviewImg" :src="props.tile.image" alt="">
        <div class="tilePreviewText">New {{ props.tile.name }}</div>
    </div>
</template>

<style scoped>
.tilePreview {
    position: relative;
    display: flex;
    width: 140px;
    min-width: 140px;
    height: 106px;
    border: 2px solid white;
    border-radius: 8px;
    overflow: clip;
    cursor: grab;
    align-items: center;
    justify-content: center;
}

.tilePreviewImg {
    image-rendering: pixelated;
    pointer-events: none;
}

.tilePreviewText {
    box-sizing: border-box;
    position: absolute;
    bottom: 0px;
    left: 0px;
    width: 100%;
    padding: 4px 4px;
    border-top: 2px solid white;
    background-color: black;
    text-align: center;
    font-size: 14px;
    transition: 100ms linear opacity;
    opacity: 0;
    pointer-events: none;
}

.tilePreview:hover>.tilePreviewText {
    opacity: 1;
}
</style>