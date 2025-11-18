<script setup lang="ts">
import { computed } from 'vue';
import { useMouse } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import TileDragGhostTile from './TileDragGhostTile.vue';

const mousePos = useMouse();
const draggingPos = computed(() => ({
    // account for borders
    x: mousePos.x.value - TileEditor.drag.offset.x - 4,
    y: mousePos.y.value - TileEditor.drag.offset.y - 4
}));
</script>

<template>
    <div id="tileDragContainer" v-if="TileEditor.drag.current !== null">
        <div id="tileDragLayoutPreview">
            <TileDragGhostTile :tile="TileEditor.root"></TileDragGhostTile>
        </div>
        <div id="tileDragTile">
            <component :is="TileEditor.drag.current.class.component" :tile="TileEditor.drag.current"></component>
            <div id="tileDragTileHeader">{{ TileEditor.drag.current.label }}</div>
        </div>
    </div>
</template>

<style scoped>
#tileDragContainer {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.4);
    user-select: none;
    cursor: grabbing;
    z-index: 1100;
}

#tileDragLayoutPreview {
    box-sizing: border-box;
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    border: 4px solid white;
    opacity: v-bind("TileEditor.drag.sidebarDrop ? '0.5' : '1'");
    transition: 50ms linear opacity;
}

#tileDragTile {
    display: flex;
    position: absolute;
    top: v-bind("draggingPos.y + 'px'");
    left: v-bind("draggingPos.x + 'px'");
    width: v-bind("TileEditor.drag.size.w + 'px'");
    height: v-bind("TileEditor.drag.size.h + 'px'");
    border: 4px solid white;
    opacity: 0.5;
    pointer-events: none;
}

#tileDragTileHeader {
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 20px;
    padding: 1px 2px;
    background-color: #555;
    font-size: 13px;
}
</style>