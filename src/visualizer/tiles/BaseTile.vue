<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import TileEditor from '../editor';
import { Tile } from '../tiles';

const props = defineProps<{
    tile: Tile
    hideHeader?: boolean
}>();

const tile = useTemplateRef('tile');

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

const destroyDisabled = computed(() => TileEditor.state.locked || TileEditor.root.children.length == 1 && TileEditor.root.children[0] == props.tile);
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

// set element for other code - there should REALLY only be one of these at a time!!
onMounted(() => {
    if (props.tile.element !== null) console.warn(`${props.tile.label} element was not null on component mount! Perhaps the tile is in multiple places?`);
    props.tile.element = tile.value;
});
onBeforeUnmount(() => {
    props.tile.element = null;
});
</script>

<template>
    <div class="tile" ref="tile">
        <slot name="content"></slot>
        <!-- put this in a popout window -->
        <slot name="options"></slot>
        <div class="tileHeader" v-if="!props.hideHeader">
            <input type="text" class="tileLabel" ref="label" v-model="props.tile.label" :size="props.tile.label.length" @focus="labelFocused = true" @blur="labelFocused = false" @mouseleave="resetLabelScroll">
            <div class="tileDrag" @mousedown="dragTile"></div>
            <input type="button" class="tileDeleteButton" title="Delete tile" @click="deleteTile" :disabled="destroyDisabled">
        </div>
        <Transition>
            <div class="tileOutline" v-if="TileEditor.state.sidebarHoverTile === props.tile"></div>
        </Transition>
    </div>
</template>

<style scoped>
.tile {
    contain: strict;
    position: relative;
    background-color: black;
    flex: v-bind("$props.tile.size");
    flex-basis: 0px;
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
    grid-column: 1;
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
    grid-column: 2;
    background-image: url(@/img/drag.svg);
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
    flex-grow: 1;
    cursor: grab;
}

.tileDeleteButton {
    grid-column: 3;
    width: 20px;
    height: 20px;
    border-radius: 0px;
    background-color: tomato;
    background-position: 50% 50%;
    background-repeat: no-repeat;
    background-size: 80% 80%;
    background-image: url(@/img/delete-dark.svg);
    transition: 50ms linear background-color;
    cursor: pointer;
}

.tileDeleteButton:hover {
    background-color: red;
}

.tileDeleteButton:active {
    background-color: #D00;
}

.tileDeleteButton:disabled {
    background-color: #777;
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