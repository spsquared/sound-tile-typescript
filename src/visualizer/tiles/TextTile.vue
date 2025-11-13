<script setup lang="ts">
import { computed, ComputedRef, inject, ref, watch } from 'vue';
import { useThrottleFn } from '@vueuse/core';
import { sanitize } from '@/components/htmlSanitize';
import TileEditor from '../editor';
import { TextTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import TrixTextEditor from '@/components/inputs/TrixTextEditor.vue';

const props = defineProps<{
    tile: TextTile
}>();
const modTargets = computed(() => props.tile.modulation.targets);

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));

const setText = useThrottleFn((v: string) => {
    props.tile.text = v;
}, 50);

// text still has to be sanitized to avoid XSS through saving payloads in a file
watch(() => props.tile.text, useThrottleFn(async (dirty) => {
    const clean = await sanitize(dirty);
    sanitizedText.value = clean;
}, 100), { immediate: true });
const sanitizedText = ref('');
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template v-slot:content>
            <div class="textContain">
                <div class="textWrapper" :style="{
                    transform: `translate(${modTargets.textOffsetX.value}%, ${modTargets.textOffsetY.value}%) scale(${modTargets.textScale.value})`
                }" v-html="sanitizedText"></div>
            </div>
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
                        <label title="Text style">
                            Text
                            <EnhancedColorPicker :picker="props.tile.textColor"></EnhancedColorPicker>
                        </label>
                        <label title="Text style">
                            Align
                            <select v-model="props.tile.align">
                                <option value="start">Start</option>
                                <option value="center">Middle</option>
                                <option value="end">End</option>
                            </select>
                        </label>
                    </div>
                </div>
            </TileOptionsSection>
            <TileOptionsSection title="Text">
                <TrixTextEditor @input="setText" :initial-value="props.tile.text" :min-lines="10" :max-lines="15" no-wrap resizeable :disabled="TileEditor.lock.locked"></TrixTextEditor>
            </TileOptionsSection>
            <TileOptionsSection title="Modulation">
                Modulation drag-and-drop UI coming soon!
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped>
.textContain {
    /* NO CSS PUTTING STUFF OUTSIDE THE BOX */
    contain: strict;
    container-type: size;
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    align-items: v-bind("$props.tile.align");
}

.textWrapper {
    margin: 4px 8px;
    flex-grow: 1;
    white-space: pre;
    text-wrap: nowrap;
    color: transparent;
    background: v-bind("$props.tile.textColor.cssStyle");
    background-clip: text;
    font-size: 10cqh;
}

pre {
    /* no scrollbar 4 u */
    overflow-x: hidden;
}

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