<script setup lang="ts">
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { GrassTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { throttledRef, useElementSize } from '@vueuse/core';

const props = defineProps<{
    tile: GrassTile
}>();

const src = ref('https://webcama1.watching-grass-grow.com/current.jpg');
let updateLoop: NodeJS.Timeout = setInterval(() => { });
onMounted(() => updateLoop = setInterval(() => src.value = 'https://webcama1.watching-grass-grow.com/current.jpg?' + Math.random(), 5000));
onUnmounted(() => clearInterval(updateLoop));

const wrapper = useTemplateRef('wrapper');
const { width: wrapperWidth, height: wrapperHeight } = useElementSize(wrapper);
const aspectRatio = throttledRef(computed(() => wrapperWidth.value / wrapperHeight.value), 50);
const width = computed(() => aspectRatio.value > 16 / 9 ? 'unset' : '100%');
const height = computed(() => aspectRatio.value > 16 / 9 ? '100%' : 'unset');
</script>

<template>
    <Tile :tile="props.tile">
        <template v-slot:content>
            <div class="grassWrapper" ref="wrapper">
                <img :src="src" :style="{ width: width, height: height }">
            </div>
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <label title="Relative size of tile to sibling tiles">
                    Size
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                </label>
            </TileOptionsSection>
            Source: <a href="https://watching-grass-grow.com">https://watching-grass-grow.com</a>
        </template>
    </Tile>
</template>

<style scoped>
.grassWrapper {
    box-sizing: border-box;
    display: flex;
    padding: 8px 8px;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
}
</style>