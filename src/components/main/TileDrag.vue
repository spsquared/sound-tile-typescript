<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import TileEditor from '@/visualizer/editor';
import TileDragGhostTile from './TileDragGhostTile.vue';

const mousePos = ref({ x: 0, y: 0 });
function mouseMove(e: MouseEvent) {
    mousePos.value.x = e.clientX;
    mousePos.value.y = e.clientY;
}
function touchMove(e: TouchEvent) {
    // no touch tracking
    const touch = e.touches[0];
    mousePos.value.x = touch?.clientX ?? 0;
    mousePos.value.y = touch?.clientY ?? 0;
}
onMounted(() => {
    document.addEventListener('mousemove', mouseMove, { passive: true });
    document.addEventListener('touchmove', touchMove, { passive: true });
});
onUnmounted(() => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('touchmove', touchMove);
});
const draggingPos = computed(() => ({
    // account for borders
    x: mousePos.value.x - TileEditor.state.drag.offset.x - 4,
    y: mousePos.value.y - TileEditor.state.drag.offset.y - 4
}));
</script>

<template>
    <Transition>
        <div id="tileDragContainer" v-if="TileEditor.state.drag.current !== null">
            <div id="tileDragLayoutPreview">
                <TileDragGhostTile :tile="TileEditor.root"></TileDragGhostTile>
            </div>
            <div id="tileDragTile">
                <component :is="TileEditor.state.drag.current.class.component" :tile="TileEditor.state.drag.current"></component>
                <div id="tileDragTileHeader">{{ TileEditor.state.drag.current.label }}</div>
            </div>
        </div>
    </Transition>
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
    transition: 100ms linear opacity;
    cursor: grabbing;
    z-index: 700;
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
    transition: 100ms linear opacity;
}

#tileDragTile {
    display: flex;
    position: absolute;
    top: v-bind("draggingPos.y + 'px'");
    left: v-bind("draggingPos.x + 'px'");
    width: v-bind("TileEditor.state.drag.size.w + 'px'");
    height: v-bind("TileEditor.state.drag.size.h + 'px'");
    border: 4px solid white;
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

.v-enter-from>#tileDragLayoutPreview,
.v-leave-to>#tileDragLayoutPreview {
    opacity: 0;
}

.v-enter-to>#tileDragLayoutPreview,
.v-leave-from>#tileDragLayoutPreview {
    opacity: 1;
}
</style>