<script setup lang="ts">
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { TextTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';

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
            <TileOptionsSection title="General">
                <label title="Relative size of tile to sibling tiles">
                    Size:
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
                </label>
                <label title="Background style of tile">
                    Background:
                    <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
                </label>
            </TileOptionsSection>
        </template>
    </BaseTile>
</template>

<style scoped></style>