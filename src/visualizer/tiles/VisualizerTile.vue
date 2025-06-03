<script setup lang="ts">
import { VisualizerTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: VisualizerTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        oof visaulsideer tile
    </BaseTile>
</template>

<style scoped></style>