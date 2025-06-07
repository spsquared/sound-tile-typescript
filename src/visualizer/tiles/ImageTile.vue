<script setup lang="ts">
import { ImageTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: ImageTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            oof iamges tile
        </template>
        <template v-slot:options>
            edit bluapple.png
        </template>
    </BaseTile>
</template>

<style scoped></style>