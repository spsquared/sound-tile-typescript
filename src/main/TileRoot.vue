<script setup lang="ts">
import { shallowRef, provide, onMounted, onUnmounted } from 'vue';
import { pointerPositionNaive } from '@/components/inputs';
import TileEditor from '@/visualizer/editor';
import GroupTile from '@/visualizer/tiles/GroupTile.vue';

// ripped straight from SidebarModulators to provide hovered element for modulator drag-and-drop
const hoveredElement = shallowRef<Element | null>(null);
provide('modulatorHoveredElement', hoveredElement);
function updateHoveredElements(e: MouseEvent | TouchEvent) {
    if (TileEditor.modulatorDrag.source === null) return;
    const pos = pointerPositionNaive(e);
    hoveredElement.value = document.elementsFromPoint(pos.x, pos.y)[1] ?? null;
}
onMounted(() => {
    document.addEventListener('mousemove', updateHoveredElements, { passive: true });
    document.addEventListener('touchmove', updateHoveredElements, { passive: true });
});
onUnmounted(() => {
    document.removeEventListener('mousemove', updateHoveredElements);
    document.removeEventListener('touchmove', updateHoveredElements);
});
</script>

<template>
    <div id="tileRoot">
        <GroupTile :tile="TileEditor.root"></GroupTile>
    </div>
    <div id="tileIdleCover" v-if="TileEditor.state.idleHideTabs"></div>
</template>

<style scoped>
#tileRoot {
    box-sizing: border-box;
    display: flex;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    padding: v-bind("TileEditor.root.orientation != TileEditor.root.class.Orientation.COLLAPSED && !TileEditor.root.hideBorders ? '4px 4px' : '0px'");
    background: v-bind("TileEditor.root.borderColor.cssStyle");
    align-items: stretch;
    justify-content: stretch;
    user-select: none;
    --radial-gradient-size: 50vmax;
}

#tileIdleCover {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    cursor: none;
}
</style>