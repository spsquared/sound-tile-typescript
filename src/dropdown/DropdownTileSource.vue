<script setup lang="ts">
import { computed } from 'vue';
import TileEditor from '@/visualizer/editor';
import TileSource from './TileSource.vue';

const sourceTiles = computed(() => Object.values(TileEditor.state.tileTypes).filter((t) => t!.visible).map((t) => t!.Tile));
</script>

<template>
    <div id="tileSourceContainer">
        <TileSource v-for="tile of sourceTiles" :key="tile.name" :tile="tile"></TileSource>
    </div>
</template>

<style scoped>
#tileSourceContainer {
    display: flex;
    border-left: 4px solid white;
    padding: 0px 8px;
    column-gap: 8px;
    flex-grow: 1;
    overflow-x: scroll;
    overflow-y: clip;
    user-select: none;
    --scrollbar-size: 10px;
}

#tileSourceContainer::-webkit-scrollbar-thumb {
    border-radius: 5px;
    background-color: white;
}

@supports (not(selector(::-webkit-scrollbar))) {
    #tileSourceContainer {
        scrollbar-width: thin;
    }
}
</style>