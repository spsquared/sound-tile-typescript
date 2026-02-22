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
import ModulatorTargetItem from '@/modulation/ModulatorTargetItem.vue';

const props = defineProps<{
    tile: TextTile
}>();
const modTargets = computed(() => props.tile.modulation.targets);

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));

const setText = useThrottleFn((v: string) => {
    props.tile.text = v;
}, 50, true, true);

// text still has to be sanitized to avoid XSS through saving payloads in a file
watch(() => props.tile.text, useThrottleFn(async (dirty) => {
    const clean = await sanitize(dirty);
    sanitizedText.value = clean;
}, 100, true, true), { immediate: true });
const sanitizedText = ref('');
</script>

<template>
    <Tile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template #content>
            <div class="textContain">
                <div class="textWrapper" :style="{
                    transform: `translate(${modTargets.textOffsetX.value}cqw, ${modTargets.textOffsetY.value}cqh) rotateZ(${modTargets.textRotation.value}deg) scale(${modTargets.textScale.value})`
                }" v-html="sanitizedText"></div>
            </div>
        </template>
        <template #options>
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
                <!-- janky wrapper to get the thing to fit and avoid cutting off the items -->
                <div style="width: 100%; min-height: calc(168px + 32px);">
                    <ModulatorTargetItem :target="props.tile.modulation" no-identify></ModulatorTargetItem>
                </div>
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped>
@import url(./options/shared.css);

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
</style>