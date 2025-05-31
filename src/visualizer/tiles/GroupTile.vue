<script setup lang="ts">
import { GroupTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: GroupTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
    </BaseTile>
</template>

<style scoped>
</style>