<script setup lang="ts">
import { useThrottle, useThrottleFn } from '@vueuse/core';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { TextTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import TrixTextEditor from '@/components/inputs/TrixTextEditor.vue';
import { computed } from 'vue';
import { sanitize } from '@/components/scripts/htmlSanitize';

const props = defineProps<{
    tile: TextTile
}>();

const setText = useThrottleFn((v: string) => {
    props.tile.text = v;
}, 50);

const throttledText = useThrottle(computed(() => props.tile.text), 100);
const sanitizedText = computed(() => sanitize(throttledText.value));
</script>

<template>
    <BaseTile :tile="props.tile" :options-window="{ minWidth: 400, minHeight: 300, resizeable: true }">
        <template v-slot:content>
            <div class="textContain" v-html="sanitizedText"></div>
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
                <label title="Text style">
                    Text
                    <EnhancedColorPicker :picker="props.tile.textColor"></EnhancedColorPicker>
                </label>
            </TileOptionsSection>
            <TileOptionsSection title="Text">
                <TrixTextEditor @input="setText" :initial-value="props.tile.text" :min-lines="10" :max-lines="15" no-wrap resizeable></TrixTextEditor>
            </TileOptionsSection>
        </template>
    </BaseTile>
</template>

<style scoped>
.textContain {
    /* NO CSS PUTTING STUFF OUTSIDE THE BOX */
    contain: strict;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    font-size: 10cqh;
    white-space: pre;
    text-wrap: nowrap;
    color: transparent;
    background: v-bind("$props.tile.textColor.cssStyle");
    background-clip: text;
}

pre {
    /* no scrollbar 4 u */
    overflow-x: hidden;
}
</style>