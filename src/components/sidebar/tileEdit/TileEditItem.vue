<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { GroupTile, Tile } from '@/visualizer/tiles';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue';
import arrowRightIcon from '@/img/arrow-right.svg';
import arrowDownIcon from '@/img/arrow-down.svg';

const props = defineProps<{
    tile: Tile
    root?: boolean
}>();

const handle = useTemplateRef('handle');
const children = useTemplateRef('children');

// set element for other code - again ONLY ONE AT A TIME
onMounted(() => {
    if (props.tile.sidebarElements !== null) console.warn(`${props.tile.label} sidebar elements are not null on component mount! Perhaps the tile is in multiple places?`);
    props.tile.sidebarElements = {
        handle: handle.value!, // is this is null someone's house will be blown up (in minecraft)
        children: children.value
    };
});
onBeforeUnmount(() => {
    props.tile.sidebarElements = null;
});

function setHover() {
    TileEditor.state.sidebarIdentifyTile = props.tile;
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

const destroyDisabled = computed(() => props.root || TileEditor.state.lock.locked || TileEditor.root.children.length == 1 && TileEditor.root.children[0] == props.tile);
function dragTile(e: MouseEvent) {
    if (TileEditor.startDrag(props.tile, { x: 100, y: 5 }, { w: 200, h: 150 }, e)) {
        TileEditor.state.sidebarIdentifyTile = null;
    }
}
function deleteTile() {
    TileEditor.pushLayoutHistory();
    props.tile.destroy();
}
</script>

<template>
    <div class="editItem">
        <div :class="{ editItemBar: true, editItemBarIdentify: TileEditor.state.editWindowIdentifyTile === props.tile }" ref="handle" @mouseenter="setHover">
            <div class="editItemGroupIcon" v-if="props.tile instanceof GroupTile" @click="toggleChildren"></div>
            <input type="text" class="editItemLabel" ref="label" v-model="props.tile.label" :size="Math.max(1, props.tile.label.length)" @focus="openChildren" @mouseleave="resetLabelScroll">
            <div class="editItemSpacer" @click="toggleChildren"></div>
            <div class="editItemDrag" v-if="!destroyDisabled" @mousedown="dragTile"></div>
            <input type="button" class="editItemEditButton" @click="toggleEditTile">
            <input type="button" class="editItemDeleteButton" title="Delete Tile" @click="deleteTile" :disabled="destroyDisabled">
            <div class="editItemDragDropBar" v-if="TileEditor.state.drag.current !== null && props.tile === TileEditor.state.drag.drop.tile"></div>
        </div>
        <Transition>
            <div class="editItemGroupChildrenWrapper" ref="children" v-if="props.tile instanceof GroupTile" v-show="childrenOpen">
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
    position: relative;
    grid-row: 1;
    grid-column: 2;
    display: flex;
    flex-direction: row;
    height: 18px;
    outline-offset: -2px;
    cursor: v-bind("props.tile instanceof GroupTile ? 'pointer' : 'default'");
}

.editItemBar:hover {
    background-color: #555;
}

.editItemBarIdentify {
    outline: 2px solid cyan;
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
    outline: 2px solid white;
    outline-offset: -2px;
}

.editItemSpacer {
    flex-grow: 1;
}

.editItemDrag,
.editItemEditButton,
.editItemDeleteButton {
    width: 18px;
    height: 18px;
    flex-basis: 18px;
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

.editItemDragDropBar {
    box-sizing: border-box;
    position: absolute;
    top: v-bind("TileEditor.state.drag.drop.insertBefore ? '-1px' : 'unset'");
    bottom: v-bind("TileEditor.state.drag.drop.insertBefore ? 'unset' : '-1px'");
    left: 0px;
    width: 100%;
    height: v-bind("TileEditor.state.drag.drop.createGroup ? 'calc(50% + 2px)' : '2px'");
    border: 2px solid white;
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
    width: 100%;
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