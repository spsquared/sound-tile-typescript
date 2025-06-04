<script setup lang="ts">
import { VisualizerTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: VisualizerTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            oof visaulsideer tile
        </template>
    </BaseTile>
</template>

<style scoped></style>