<script setup lang="ts">
import { AudioLevelsTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: AudioLevelsTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        oof iamges tile
    </BaseTile>
</template>

<style scoped></style>