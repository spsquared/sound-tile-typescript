<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const mousePos = ref({ x: 0, y: 0 });
function mouseMove(e: MouseEvent) {
    mousePos.value.x = e.clientX;
    mousePos.value.y = e.clientY;
}
onMounted(() => document.addEventListener('mousemove', mouseMove));
onUnmounted(() => document.removeEventListener('mousemove', mouseMove));
const draggingPos = computed(() => ({
    // account for borders
    x: mousePos.value.x - TileEditor.state.dragging.offset.x - 4,
    y: mousePos.value.y - TileEditor.state.dragging.offset.y - 4
}));
</script>

<template>
    <div id="tileDragContainer" v-if="TileEditor.state.dragging.current !== null">
        <div id="tileDragTile">
            <component :is="TileEditor.state.dragging.current.class.component" :tile="TileEditor.state.dragging.current"></component>
            <div id="tileDragTileHeader"></div>
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
    z-index: 700;
}

#tileDragTile {
    position: absolute;
    top: v-bind("draggingPos.y + 'px'");
    left: v-bind("draggingPos.x + 'px'");
    width: v-bind("TileEditor.state.dragging.size.w + 'px'");
    height: v-bind("TileEditor.state.dragging.size.h + 'px'");
    border: 4px solid white;
    pointer-events: none;
}

#tileDragTileHeader {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 20px;
    background-color: #555;
}
</style>