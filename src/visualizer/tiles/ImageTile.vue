<script setup lang="ts">
import { ImageTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: ImageTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        oof iamges tile
    </BaseTile>
</template>

<style scoped></style>