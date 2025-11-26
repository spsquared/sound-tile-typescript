<script setup lang="ts">
import { computed, ComputedRef, inject, ref } from 'vue';
import TileEditor from '../editor';
import { BeepboxTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';

const props = defineProps<{
    tile: BeepboxTile
}>();
const options = computed(() => props.tile.visualizer.data);

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));

const uploadJsonDisabled = ref(false);
function uploadJson() {

}
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template #content>
            such beep and even more box
            <div class="beepboxUploadCover" v-if="true">
                <input type="button" class="uploadButton" @click="uploadJson" value="Upload JSON song data" title="Upload a JSON export of your BeepBox project" :disabled="uploadJsonDisabled || TileEditor.lock.locked">
            </div>
        </template>
        <template #options>
            <TileOptionsSection title="General">
                <div class="optionsRows">
                    <div>
                        <input type="button" class="uploadButton" @click="uploadJson" :value="options.song === null ? 'Upload JSON song data' : 'Replace song data'" :title="`${options.song === null ? 'Upload a' : 'Replace the'} BeepBox song data (exported in JSON format)`" :disabled="uploadJsonDisabled || TileEditor.lock.locked">
                    </div>
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
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Colors">
                <div class="optionsGrid">
                    <label title="Background style of tile">
                        Background
                        <EnhancedColorPicker :picker="props.tile.backgroundColor" :disabled="inCollapsedGroup"></EnhancedColorPicker>
                    </label>
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