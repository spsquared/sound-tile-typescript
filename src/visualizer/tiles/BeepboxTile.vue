<script setup lang="ts">
import { computed, ComputedRef, inject } from 'vue';
import { BeepboxTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';

const props = defineProps<{
    tile: BeepboxTile
}>();

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template v-slot:content>
            such beep and even more box
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <div class="optionsRows">
                    <div>
                        <label title="Label of tile">
                            Label
                            <input type="text" v-model="props.tile.label">
                        </label>
                        <label title="Relative size of tile to sibling tiles">
                            Size
                            <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                        </label>
                    </div>
                    <div>
                        <label title="Background style of tile">
                            Background
                            <EnhancedColorPicker :picker="props.tile.backgroundColor" :disabled="inCollapsedGroup"></EnhancedColorPicker>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped>
.optionsRows {
    display: flex;
    flex-direction: column;
    width: 100%;
    row-gap: 4px;
}

.optionsRows>div {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    column-gap: 12px;
    row-gap: 4px;
}
</style>