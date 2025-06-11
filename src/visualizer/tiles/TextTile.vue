<script setup lang="ts">
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { TextTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import ColorPicker from '@/components/inputs/ColorPicker.vue';

const props = defineProps<{
    tile: TextTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile">
        <template v-slot:content>
            oof text tile
        </template>
        <template v-slot:options>
            <label>
                Size:
                <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
            </label>
            <label>
                Background:
                <ColorPicker :picker="props.tile.backgroundColor"></ColorPicker>
            </label>
        </template>
    </BaseTile>
</template>

<style scoped></style>