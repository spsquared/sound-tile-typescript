<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { GroupTile, Tile } from '@/visualizer/tiles';
import { computed, ref, useTemplateRef } from 'vue';
import arrowRightIcon from '@/img/arrow-right.svg';
import arrowDownIcon from '@/img/arrow-down.svg';

const props = defineProps<{
    tile: Tile
    root?: boolean
}>();


function setHover() {
    TileEditor.state.sidebarHoverTile = props.tile;
}

const label = useTemplateRef('label');
function resetLabelScroll() {
    if (label.value !== null) label.value.scrollLeft = 0;
}

const childrenOpen = ref(true);
function toggleChildren() {
    childrenOpen.value = !childrenOpen.value;
}
function openChildren() {
    childrenOpen.value = true;
}

function toggleEditTile() {
    props.tile.editPaneOpen = !props.tile.editPaneOpen;
}

function dragTile(e: MouseEvent) {
    if (TileEditor.startDrag(props.tile, { x: 100, y: 5 }, { w: 200, h: 150 }, e)) {
        TileEditor.state.sidebarHoverTile = null;
    }
}

const destroyDisabled = computed(() => props.root || TileEditor.state.lock.locked || TileEditor.root.children.length == 1 && TileEditor.root.children[0] == props.tile);
function deleteTile() {
    TileEditor.pushLayoutHistory();
    props.tile.destroy();
}
</script>

<template>
    <div class="editItem">
        <div class="editItemBar" @mouseenter="setHover">
            <div class="editItemGroupIcon" v-if="props.tile instanceof GroupTile" @click="toggleChildren"></div>
            <input type="text" class="editItemLabel" ref="label" v-model="props.tile.label" :size="props.tile.label.length - 1" @focus="openChildren" @mouseleave="resetLabelScroll">
            <div class="editItemSpacer" @click="toggleChildren"></div>
            <div class="editItemDrag" v-if="!destroyDisabled" @mousedown="dragTile"></div>
            <input type="button" class="editItemEditButton" @click="toggleEditTile">
            <input type="button" class="editItemDeleteButton" title="Delete Tile" @click="deleteTile" :disabled="destroyDisabled">
        </div>
        <Transition>
            <div class="editItemGroupChildrenWrapper" v-if="props.tile instanceof GroupTile" v-show="childrenOpen">
                <div class="editItemGroupChildren">
                    <TileEditItem v-for="child of props.tile.children" :key="child.id" :tile="child"></TileEditItem>
                </div>
                <div class="editItemGroupLine"></div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.editItem {
    display: flex;
    flex-direction: column;
    margin-left: v-bind("$props.root ? '0px' : '18px'");
}

.editItemBar {
    /* prevents flex blowout caused by input */
    contain: size;
    grid-row: 1;
    grid-column: 2;
    display: flex;
    flex-direction: row;
    height: 18px;
    cursor: v-bind("props.tile instanceof GroupTile ? 'pointer' : 'default'");
}

.editItemBar:hover {
    background-color: #555;
}

.editItemGroupIcon,
.editItemDrag,
.editItemEditButton,
.editItemDeleteButton {
    background-position: center;
    background-size: 90% 90%;
    background-repeat: no-repeat;
}

.editItemGroupIcon {
    width: 18px;
    height: 18px;
    background-color: transparent;
    background-image: v-bind('childrenOpen ? `url("${arrowDownIcon}")` : `url("${arrowRightIcon}")`');
    background-size: 80% 80%;
}

.editItemLabel {
    min-width: 0px;
    flex-shrink: 1;
    border-radius: 0px;
    background-color: transparent;
    font-size: 14px;
    line-height: 1em;
    user-select: none;
}

.editItemLabel:focus-visible {
    outline: 1px solid white;
    outline-offset: -1px;
}

.editItemSpacer {
    flex-grow: 1;
}

.editItemDrag,
.editItemEditButton,
.editItemDeleteButton {
    width: 18px;
    height: 18px;
    border-radius: 0px;
    background-color: transparent;
    opacity: 0;
    cursor: pointer;
}

.editItemBar:hover>.editItemDrag,
.editItemBar:hover>.editItemEditButton,
.editItemBar:hover>.editItemDeleteButton {
    opacity: 1;
}

.editItemDrag {
    background-image: url(@/img/drag.svg);
    cursor: grab;
}

.editItemEditButton {
    background-image: url(@/img/edit.svg);
    background-size: 80% 80%;
}

.editItemEditButton:hover {
    background-color: dodgerblue;
}

.editItemDeleteButton {
    background-image: url(@/img/delete.svg);
}

.editItemDeleteButton:hover {
    background-image: url(@/img/delete-dark.svg);
    background-color: red;
}

.editItemDeleteButton:disabled {
    cursor: not-allowed;
    background-color: transparent;
}

.editItemGroupChildrenWrapper {
    grid-row: 2;
    grid-column: 2;
    display: grid;
    position: relative;
}

.editItemGroupChildren {
    display: flex;
    flex-direction: column;
}

.editItemGroupLine {
    position: absolute;
    top: 0px;
    left: 8px;
    width: 2px;
    height: calc(100% - 3px);
    background-color: #333;
}

.editItemGroupChildrenWrapper:hover>.editItemGroupLine,
.editItemBar:hover+.editItemGroupChildrenWrapper>.editItemGroupLine {
    background-color: #555;
}
</style>