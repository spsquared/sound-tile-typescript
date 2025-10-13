<script setup lang="ts">
import GroupTile from '@/visualizer/tiles/GroupTile.vue';
import TileEditor from '@/visualizer/editor';
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
    padding: v-bind("TileEditor.root.orientation != TileEditor.root.class.COLLAPSED && !TileEditor.root.hideBorders ? '4px 4px' : '0px'");
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