<script setup lang="ts">
import GroupTile from '@/visualizer/tiles/GroupTile.vue';
import TileEditor from '@/visualizer/editor';
</script>

<template>
    <div class="tileRoot">
        <GroupTile :tile="TileEditor.root"></GroupTile>
    </div>
    <div class="tileIdleCover" v-if="TileEditor.state.idleHideTabs"></div>
</template>

<style scoped>
.tileRoot {
    box-sizing: border-box;
    display: flex;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    border: 4px solid v-bind("TileEditor.root.borderColor.cssStyle");
    align-items: stretch;
    justify-content: stretch;
    user-select: none;
}

.tileIdleCover {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    cursor: none;
}
</style>