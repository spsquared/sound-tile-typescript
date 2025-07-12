<script setup lang="ts">
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { TextTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import TrixTextEditor from '@/components/inputs/TrixTextEditor.vue';

const props = defineProps<{
    tile: TextTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template v-slot:content>
            oof text tile
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
            <TileOptionsSection title="Text">
                <TrixTextEditor></TrixTextEditor>
            </TileOptionsSection>
        </template>
    </BaseTile>
</template>

<style scoped></style>