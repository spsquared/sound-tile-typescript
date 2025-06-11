<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import TileEditor from '../editor';
import { Tile } from '../tiles';
import DraggableWindow from '@/components/DraggableWindow.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import ColorPicker from '@/components/inputs/ColorPicker.vue';
import { useElementSize } from '@vueuse/core';

const props = defineProps<{
    tile: Tile
    hideHeader?: boolean
}>();

const tile = useTemplateRef('tile');
const { width: tileWidth, height: tileHeight } = useElementSize(tile);

// set element for other code - there should REALLY only be one of these at a time!!
onMounted(() => {
    if (props.tile.element !== null) console.warn(`${props.tile.label} element was not null on component mount! Perhaps the tile is in multiple places?`);
    props.tile.element = tile.value;
});
onBeforeUnmount(() => {
    props.tile.element = null;
});

function dragTile(e: MouseEvent) {
    const rect = tile.value?.getBoundingClientRect();
    TileEditor.startDrag(props.tile, {
        x: e.clientX - (rect?.left ?? e.clientX),
        y: e.clientY - (rect?.top ?? e.clientY),
    }, {
        w: rect?.width ?? 200,
        h: rect?.height ?? 150
    }, e);
}

const destroyDisabled = computed(() => TileEditor.state.lock.locked || TileEditor.root.children.length == 1 && TileEditor.root.children[0] == props.tile);
function deleteTile() {
    if (destroyDisabled.value) return;
    TileEditor.pushLayoutHistory();
    props.tile.destroy();
}

const label = useTemplateRef('label');
const labelFocused = ref(false);
function resetLabelScroll() {
    if (label.value !== null && !labelFocused) label.value.scrollLeft = 0;
}

function toggleEditTile() {
    props.tile.editPaneOpen = !props.tile.editPaneOpen;
}
</script>

<template>
    <div class="tile" ref="tile">
        <slot name="content"></slot>
        <DraggableWindow v-model="props.tile.editPaneOpen" :title="props.tile.label" resizeable :min-width="300" :min-height="200">
            <slot name="options">
                <label>
                    Size:
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
                </label>
                <label>
                    Background:
                    <ColorPicker :picker="props.tile.backgroundColor"></ColorPicker>
                </label>
            </slot>
        </DraggableWindow>
        <div class="tileHeader" v-if="!props.hideHeader">
            <input type="text" class="tileLabel" ref="label" v-model="props.tile.label" :size="props.tile.label.length" @focus="labelFocused = true" @blur="labelFocused = false" @mouseleave="resetLabelScroll">
            <div class="tileDrag" v-if="!destroyDisabled" @mousedown="dragTile"></div>
            <div class="tileDragDisabled" v-else></div>
            <input type="button" class="tileDeleteButton" title="Delete tile" @click="deleteTile" :disabled="destroyDisabled">
        </div>
        <input type="button" v-if="!props.hideHeader" class="tileEditButton" @click="toggleEditTile">
        <Transition>
            <div class="tileOutline" v-if="TileEditor.state.sidebarHoverTile === props.tile"></div>
        </Transition>
    </div>
</template>

<style scoped>
.tile {
    contain: strict;
    position: relative;
    background: v-bind("props.tile.backgroundColor.cssStyle");
    flex: v-bind("$props.tile.size");
    flex-basis: 0px;
    --radial-gradient-size: v-bind("Math.max(tileWidth, tileHeight) / 2 + 'px'");
}

.tileHeader {
    display: flex;
    flex-direction: row;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 20px;
    background-color: #555;
    transition: 100ms linear opacity;
    opacity: v-bind("labelFocused ? 1 : 0");
}

.tileHeader:hover {
    opacity: 1;
}

.tileLabel {
    min-width: 0px;
    max-width: calc(100% - 84px);
    border-radius: 0px;
    background-color: transparent;
}

.tileLabel:focus-visible {
    outline: 1px solid white;
    outline-offset: -1px;
}

.tileDrag {
    background-image: url(@/img/drag.svg);
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    flex-grow: 1;
    cursor: grab;
}

.tileDragDisabled {
    flex-grow: 1;
}

.tileDeleteButton {
    width: 20px;
    height: 20px;
    border-radius: 0px;
    background-color: red;
    background-image: url(@/img/delete-dark.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    transition: 50ms linear background-color;
    cursor: pointer;
}

.tileDeleteButton:hover {
    background-color: tomato;
}

.tileDeleteButton:active {
    background-color: #D00;
}

.tileDeleteButton:disabled {
    background-color: #777;
    cursor: not-allowed;
}

.tileEditButton {
    position: absolute;
    bottom: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background-color: dodgerblue;
    background-image: url(@/img/edit.svg);
    background-position: center;
    background-repeat: no-repeat;
    background-size: 60% 60%;
    opacity: 0;
    transition: 100ms linear opacity;
}

.tileEditButton:hover {
    opacity: 1;
}

.tileOutline {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    outline: 4px dashed cyan;
    outline-offset: -4px;
    transition: 50ms linear opacity;
    pointer-events: none;
    z-index: 100;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-enter-to,
.v-leave-from {
    opacity: 1;
}
</style>