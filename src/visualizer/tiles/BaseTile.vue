<script setup lang="ts">
import { Tile } from '../tiles';

const props = defineProps<{
    tile: Tile
}>();
</script>

<template>
    <div class="tile">
        <div class="tileHeader">
            <input type="button" id="tileDeleteButton" @click="props.tile.delete()">
        </div>
        <slot></slot>
    </div>
</template>

<style scoped>
.tile {
    background-color: black;
    border: 2px solid white;
}
</style>