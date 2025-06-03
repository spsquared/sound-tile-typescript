<script setup lang="ts">
import { TextTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: TextTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        oof text tile
    </BaseTile>
</template>

<style scoped></style>