<script setup lang="ts">
import { ImageTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';

const props = defineProps<{
    tile: ImageTile
}>();
</script>

<template>
    <Tile :tile="props.tile">
        <template v-slot:content>
            oof iamges tile
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <label title="Label of tile">
                    Label
                    <input type="text" v-model="props.tile.label">
                </label>
                <label title="Relative size of tile to sibling tiles">
                    Size
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                </label>
                <label title="Background style of tile">
                    Background
                    <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
                </label>
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped></style>