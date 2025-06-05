<script setup lang="ts">
import { computed, ref } from 'vue';
import TileEditor from '../editor';
import { Tile } from '../tiles';
import FullscreenModal, { ModalMode } from '@/components/util/FullscreenModal.vue';

const props = defineProps<{
    tile: Tile
    hideHeader?: boolean
}>();

const destroyDisabled = computed(() => TileEditor.state.locked || TileEditor.root.children.length == 1 && TileEditor.root.children[0] == props.tile);
const deleteConfirmModal = ref(false);
function deleteTile() {
    if (destroyDisabled.value) return;
    deleteConfirmModal.value = true;
}
function confirmDeleteTile(success: boolean) {
    if (success) props.tile.destroy();
}

const forceShowHeader = ref(false);
function focusLabel() {
    forceShowHeader.value = true;
}
function blurLabel() {
    forceShowHeader.value = false;
}
</script>

<template>
    <div class="tile">
        <slot name="content"></slot>
        <slot name="options"></slot>
        <div class="tileHeader" v-if="!props.hideHeader">
            <input type="text" class="tileLabel" v-model="props.tile.label" :size="props.tile.label.length" @focus="focusLabel()" @blur="blurLabel()">
            <div class="tileDrag"></div>
            <input type="button" class="tileDeleteButton" @click="deleteTile()" :disabled="destroyDisabled">
        </div>
    </div>
    <FullscreenModal v-model="deleteConfirmModal" :title="`Delete ${props.tile.label}?`" :mode="ModalMode.CONFIRM_WARN" color="red" @close="confirmDeleteTile">
        Deleting is permanent!
    </FullscreenModal>
</template>

<style scoped>
.tile {
    contain: size;
    position: relative;
    background-color: black;
    flex: 1;
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
    transition: 200ms linear opacity;
    opacity: 0;
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
    background-image: url(@/img/delete.svg);
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
</style>