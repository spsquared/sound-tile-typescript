<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { GroupTile, Tile } from '@/visualizer/tiles';
import { ref } from 'vue';
import arrowRightIcon from '@/img/arrow-right.svg';
import arrowDownIcon from '@/img/arrow-down.svg';
import FullscreenModal, { ModalMode } from '@/components/util/FullscreenModal.vue';

const props = defineProps<{
    tile: Tile
    root?: boolean
}>();

function setHover() {
    TileEditor.state.sidebarHoverTile = props.tile;
}

const childrenOpen = ref(true);
function toggleChildren() {
    childrenOpen.value = !childrenOpen.value;
}
function openChildren() {
    childrenOpen.value = true;
}

const deleteConfirmModal = ref(false);
function deleteTile() {
    deleteConfirmModal.value = true;
}
function confirmDeleteTile(success: boolean) {
    if (success) props.tile.destroy();
}
</script>

<template>
    <div class="editItem">
        <div class="editItemBar" @mouseenter="setHover()">
            <div class="editItemGroupIcon" v-if="props.tile instanceof GroupTile" @click="toggleChildren()"></div>
            <input type="text" class="editItemLabel" v-model="props.tile.label" :size="props.tile.label.length - 1" @focus="openChildren()">
            <div class="editItemSpacer" @click="toggleChildren()"></div>
            <input type="button" class="editItemDeleteButton" @click="deleteTile()">
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
    <FullscreenModal v-model="deleteConfirmModal" :title="`Delete ${props.tile.label}?`" :mode="ModalMode.CONFIRM_WARN" color="red" @close="confirmDeleteTile">
        Deleting is permanent!
    </FullscreenModal>
</template>

<style scoped>
.editItem {
    display: flex;
    flex-direction: column;
    margin-left: v-bind("$props.root ? '0px' : '18px'");
}

.editItemBar {
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

.editItemGroupIcon {
    width: 18px;
    height: 18px;
    background-color: transparent;
    background-image: v-bind('childrenOpen ? `url("${arrowDownIcon}")` : `url("${arrowRightIcon}")`');
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.editItemLabel {
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

.editItemDeleteButton {
    width: 18px;
    height: 18px;
    border-radius: 0px;
    cursor: pointer;
    background-color: transparent;
    background-image: url(@/img/delete.svg);
    background-position: center;
    background-size: 90% 90%;
    background-repeat: no-repeat;
}

.editItemDeleteButton:hover {
    background-color: red;
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