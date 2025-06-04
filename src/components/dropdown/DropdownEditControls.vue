<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import TileEditor from '@/visualizer/editor';
import TileSource from './TileSource.vue';

function keypress(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target.matches('input[type=text],input[type=number]')) return;
    if (e.key.toLowerCase() == 't' && !e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) {
        TileEditor.state.treeMode = !TileEditor.state.treeMode;
    }
}
onMounted(() => document.addEventListener('keypress', keypress));
onUnmounted(() => document.removeEventListener('keypress', keypress));

const sourceTiles = computed(() => Object.values(TileEditor.state.tileTypes).filter((t) => t.visible).map((t) => t.Tile));
</script>

<template>
    <div id="treeModeToggleContainer">
        <label button id="tileMode" for="treeModeToggle" title="Tile view" :disabled="!TileEditor.state.treeMode"></label>
        <label button id="treeMode" for="treeModeToggle" title="Tree view" :disabled="TileEditor.state.treeMode"></label>
        <input type="checkbox" id="treeModeToggle" v-model="TileEditor.state.treeMode">
        <div id="treeModeToggleSlider"></div>
        <div id="tileModeImg"></div>
        <div id="treeModeImg"></div>
    </div>
    <div id="tileSourceContainer">
        <TileSource v-for="tile of sourceTiles" :tile="tile" :key="tile.name"></TileSource>
    </div>
</template>

<style scoped>
#treeModeToggleContainer {
    display: grid;
    grid-template-rows: 60px 60px;
    border-left: 4px solid white;
}

#treeModeToggle {
    display: none;
}

#tileMode,
#treeMode {
    width: 58px;
    height: 58px;
    border-radius: 0px;
    background-color: #333;
}

#tileMode:hover,
#treeMode:hover {
    background-color: #444;
}

#tileMode[disabled=true],
#treeMode[disabled=true] {
    cursor: default;
}

#tileModeImg,
#treeModeImg {
    width: 58px;
    height: 58px;
    /* transform fixes layering (transform displays on top of non-transformed) */
    transform: translateY(0px);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    pointer-events: none;
}

#tileMode,
#tileModeImg {
    grid-row: 1;
    grid-column: 1;
    border-bottom: 2px solid white;
}

#treeMode,
#treeModeImg {
    grid-row: 2;
    grid-column: 1;
    border-top: 2px solid white;
}

#tileModeImg {
    background-image: url(@/img/tilemode.png);
}

#treeModeImg {
    background-image: url(@/img/treemode.png);
}

#treeModeToggleSlider {
    grid-row: 1;
    grid-column: 1;
    width: 58px;
    height: 58px;
    background-color: #070;
    transition: 100ms linear transform;
    transform: translateY(0px);
    pointer-events: none;
}

#treeModeToggle:checked+#treeModeToggleSlider {
    transform: translateY(62px);
}

#treeModeToggleContainer::after {
    content: '';
    position: absolute;
    top: 58px;
    width: 58px;
    height: 4px;
    background-color: white;
    pointer-events: none;
}

#tileSourceContainer {
    display: flex;
    border-left: 4px solid white;
    padding: 0px 8px;
    column-gap: 8px;
    flex-grow: 1;
    overflow-x: scroll;
    overflow-y: hidden;
    --scrollbar-size: 10px;
}

#tileSourceContainer::-webkit-scrollbar-thumb {
    border-radius: 5px;
    background-color: white;
}
</style>