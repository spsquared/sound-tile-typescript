<script setup lang="ts">
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import { GrassTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { refThrottled, useElementSize } from '@vueuse/core';

const props = defineProps<{
    tile: GrassTile
}>();

const src = ref('https://webcama1.watching-grass-grow.com/current.jpg');
let updateLoop: NodeJS.Timeout = setInterval(() => { });
onMounted(() => updateLoop = setInterval(() => src.value = 'https://webcama1.watching-grass-grow.com/current.jpg?' + Math.random(), 5000));
onUnmounted(() => clearInterval(updateLoop));

const wrapper = useTemplateRef('wrapper');
const { width: wrapperWidth, height: wrapperHeight } = useElementSize(wrapper);
const aspectRatio = refThrottled(computed(() => wrapperWidth.value / wrapperHeight.value), 50);
const width = computed(() => aspectRatio.value > 16 / 9 ? 'unset' : '100%');
const height = computed(() => aspectRatio.value > 16 / 9 ? '100%' : 'unset');
</script>

<template>
    <Tile :tile="props.tile">
        <template #content>
            <div class="grassWrapper" ref="wrapper">
                <img :src="src" :style="{ width: width, height: height }">
            </div>
        </template>
        <template #options>
            <div class="grassCoolBackground"></div>
            <TileOptionsSection title="General">
                <label title="Relative size of tile to sibling tiles">
                    Size
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                </label>
            </TileOptionsSection>
            <a href="https://www.watching-grass-grow.com/"><img style="border: 2px solid green;" src="https://www.watching-grass-grow.com/watching-grass-grow.gif" alt="watching grass grow" title="watching grass grow"></a>
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

.grassCoolBackground {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    /*
    so background: fixed doesnt make it display the background fixed to the viewport
    or at least not here probably because of some shenanigans in the draggable window
     */
    background-image: url(/logo-border.png);
    background-size: 80px 80px;
    animation: 10000ms linear grass-tile-cool-background-super-secret-thingy infinite;
    background-repeat: repeat;
    z-index: -1;
}

@keyframes grass-tile-cool-background-super-secret-thingy {
    from {
        background-position: 40px 00px;
    }

    to {
        background-position: 120px 160px;
    }
}
</style>