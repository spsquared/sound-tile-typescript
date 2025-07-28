<script setup lang="ts">
import { computed, ComputedRef, inject, reactive, ref, useTemplateRef } from 'vue';
import { throttledWatch, useElementSize } from '@vueuse/core';
import FileAccess from '@/components/inputs/fileAccess';
import TileEditor from '../editor';
import { ImageTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Toggle from '@/components/inputs/Toggle.vue';

const props = defineProps<{
    tile: ImageTile
}>();
const modTargets = computed(() => props.tile.modulation.targets);

const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));

const wrapper = useTemplateRef('imageWrapper');
const image = useTemplateRef('image');
const { width: wrapperWidth, height: wrapperHeight } = useElementSize(wrapper);
const imgCss = reactive({ width: 'unset', height: 'unset' });
function resizeImage() {
    if (image.value === null) return;
    if (wrapperWidth.value / wrapperHeight.value > image.value.width / image.value.height) {
        imgCss.width = 'unset';
        imgCss.height = wrapperHeight.value + 'px';
    } else {
        imgCss.width = wrapperWidth.value + 'px';
        imgCss.height = 'unset';
    }
}
throttledWatch([wrapperWidth, wrapperHeight], () => resizeImage(), { throttle: 50, trailing: true, leading: true });

const uploadImageDisabled = ref(false);
async function uploadImage() {
    uploadImageDisabled.value = true;
    const source = await FileAccess.openFilePicker({
        id: 'soundtileUploadImage',
        types: [{
            accept: {
                'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.bmp']
            }
        }]
    });
    if (source.length > 0) {
        const reader = new FileReader();
        reader.onload = () => props.tile.imgSrc = reader.result as string;
        reader.readAsDataURL(source[0]);
    }
    uploadImageDisabled.value = false;
}
</script>

<template>
    <Tile :tile="props.tile">
        <template v-slot:content>
            <div class="imageWrapper" ref="imageWrapper">
                <img :class="{
                    image: true,
                    draggableImage: props.tile.editPaneOpen && !inCollapsedGroup
                }" ref="image" :src="props.tile.imgSrc" v-if="props.tile.imgSrc != ''" @load="resizeImage">
            </div>
            <div class="imageUploadCover" v-if="props.tile.imgSrc == ''">
                <input type="button" class="uploadButton" @click="uploadImage" value="Upload image" :disabled="uploadImageDisabled || TileEditor.state.lock.locked">
            </div>
        </template>
        <template v-slot:options>
            <TileOptionsSection title="General">
                <label title="Image source">
                    <input type="button" class="uploadButton" @click="uploadImage" :value="props.tile.imgSrc == '' ? 'Upload image' : 'Replace image'" :disabled="uploadImageDisabled || TileEditor.state.lock.locked">
                </label>
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
            <TileOptionsSection title="Image">
                <label title="Interpolate the image smoothly instead of naive &quot;pixelated&quot; sampling">
                    Smooth Draw
                    <Toggle v-model="props.tile.smoothDrawing"></Toggle>
                </label>
            </TileOptionsSection>
            <TileOptionsSection title="Position">
            </TileOptionsSection>
            <TileOptionsSection title="Modulation">
                Modulation drag-and-drop UI coming soon!
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped>
.imageWrapper {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
}

.image {
    position: absolute;
    top: v-bind("$props.tile.position.y + '%'");
    left: v-bind("$props.tile.position.x + '%'");
    width: v-bind("imgCss.width");
    height: v-bind("imgCss.height");
    image-rendering: v-bind("$props.tile.smoothDrawing ? 'auto' : 'pixelated'");
    /* bruh autoformatter LET ME MAKE SEPARATE LINES */
    transform: translate(v-bind("modTargets.imgOffsetX.value - 50 + '%'"), v-bind("modTargets.imgOffsetY.value - 50 + '%'")) rotateZ(v-bind("modTargets.imgRotation.value + 'deg'")) scale(v-bind("modTargets.imgScale.value"));
}

.draggableImage {
    cursor: move;
}

.draggableImage:hover {
    outline: 1px solid cyan;
}

.imageUploadCover {
    display: flex;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
}

.uploadButton {
    background-color: dodgerblue;
}

.uploadButton:hover {
    background-color: color-mix(in hsl, dodgerblue 80%, cyan 20%);
}

.uploadButton:disabled {
    background-color: gray;
}
</style>