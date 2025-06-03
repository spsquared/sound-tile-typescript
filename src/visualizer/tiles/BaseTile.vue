<script setup lang="ts">
import { Tile } from '../tiles';

const props = defineProps<{
    tile: Tile
    hideHeader?: boolean
}>();
</script>

<template>
    <div class="tile">
        <slot></slot>
        <div class="tileHeader" v-if="!props.hideHeader">
            <input type="button" class="tileDeleteButton" @click="props.tile.destroy()">
        </div>
    </div>
</template>

<style scoped>
.tile {
    contain: size;
    position: relative;
    background-color: black;
    flex-grow: 1;
    flex-shrink: 1;
    flex-basis: 0px;
}

.tileHeader {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 20px;
    background-color: #555;
    transition: 200ms linear opacity;
    opacity: 0;
    cursor: grab;
}

.tileHeader:hover {
    opacity: 1;
}

.tileDeleteButton {
    position: absolute;
    top: 0px;
    right: 0px;
    width: 20px;
    height: 20px;
    border-radius: 0px;
    background-color: tomato;
    background-position: 50% 50%;
    background-repeat: no-repeat;
    background-size: 80% 80%;
    background-image: url(@/img/delete.svg);
    transition: 50ms linear background-color;
    cursor: pointer;
}

.tileDeleteButton:hover {
    background-color: red;
}
</style>