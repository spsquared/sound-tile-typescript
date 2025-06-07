<script setup lang="ts">
import { AudioLevelsTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: AudioLevelsTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            oof audio levels tile
        </template>
        <template v-slot:options>
            edit audio levels
        </template>
    </BaseTile>
</template>

<style scoped></style>