<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import TileEditor from '@/visualizer/editor';
import { Tile } from '@/visualizer/tiles';
import Modulation from '@/visualizer/modulation';
import DraggableWindow from '@/components/DraggableWindow.vue';

const props = defineProps<{
    connection: Modulation.Connection
    type: 'source' | 'target' | 'standalone'
}>();

function disconnect() {
    props.connection.source.disconnect(props.connection.target, props.connection.sourceKey, props.connection.targetKey);
}

const connectionLabel = useTemplateRef('connectionLabel');
const transformsWindow = useTemplateRef('transformsWindow');
const windowOpen = ref(false);
function openWindow() {
    windowOpen.value = true;
    if (connectionLabel.value !== null && transformsWindow.value !== null) {
        const rect = connectionLabel.value.getBoundingClientRect();
        transformsWindow.value.height = 250;
        transformsWindow.value.posX = rect.left - 412; // borders + margin
        transformsWindow.value.posY = rect.top;
        transformsWindow.value.focus();
    }
}

function setTileHover(tile: Tile | null) {
    TileEditor.state.editWindowIdentifyTile = tile;
}
function resetTileHover() {
    TileEditor.state.editWindowIdentifyTile = null;
}
</script>

<template>
    <div class="connectionEntry" :title="`Edit transforms for connection ${props.connection.source.label} [${props.connection.sourceKey}] > ${props.connection.target.label} [${props.connection.targetKey}]`">
        <input type="button" class="connectionDelete" title="Disconnect modulation" @click="disconnect">
        <div class="connectionLabel" ref="connectionLabel" @click="openWindow">
            <div>
                <span v-if="props.type != 'source'">{{ props.connection.source.label + ' ' }}</span>
                <span v-else>This&ensp;</span>
                <span class="connectionSourceKey">[{{ props.connection.sourceKey }}]</span>
            </div>
            <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
            <div>
                <span v-if="props.type != 'target'">{{ props.connection.target.label + ' ' }}</span>
                <span v-else>This&ensp;</span>
                <span class="connectionTargetKey">[{{ props.connection.targetKey }}]</span>
            </div>
        </div>
    </div>
    <div class="connectionDivider"></div>
    <DraggableWindow v-model="windowOpen" ref="transformsWindow" title="Transforms" :min-width="400" :min-height="200" resize-height close-on-click-out>
        <div class="connectionLabel transformsConnectionHeader">
            <div :title="`Source: ${props.connection.source.label} [${props.connection.sourceKey}]`" @mouseenter="setTileHover(props.connection.source.tile)" @mouseleave="resetTileHover">{{ props.connection.source.label }} <span class="connectionSourceKey">[{{ props.connection.sourceKey }}]</span></div>
            <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
            <div :title="`Target: ${props.connection.target.label} [${props.connection.targetKey}]`" @mouseenter="setTileHover(props.connection.target.tile)" @mouseleave="resetTileHover">{{ props.connection.target.label }} <span class="connectionTargetKey">[{{ props.connection.targetKey }}]</span></div>
        </div>
        <div class="transformsContainer">
            <div class="transformItem" v-for="t, i in props.connection.transforms" :key="i">
                {{ t }}
            </div>
        </div>
    </DraggableWindow>
</template>

<style scoped>
.connectionEntry {
    container-type: inline-size;
    --connection-border-radius: 6px;
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr calc(24px + var(--connection-border-radius));
    min-height: 24px;
    margin-left: 24px;
}

.connectionLabel {
    grid-row: 1;
    grid-column: 1 / 3;
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr min-content 1fr;
    min-height: 20px;
    padding: 2px 4px;
    border-radius: var(--connection-border-radius);
    column-gap: 2px;
    align-items: center;
    background-color: var(--mod-item-background-color);
    transition: 200ms ease transform;
    user-select: none;
    cursor: pointer;
}

.connectionEntry:hover>.connectionLabel,
.connectionDelete:focus-visible+.connectionLabel {
    transform: translateX(-24px);
    background-color: #555;
    border-bottom-color: #777;
}

.connectionLabel>div {
    min-width: 0px;
    font-size: 14px;
    text-align: center;
    /* text-wrap: nowrap; */
    text-overflow: ellipsis;
    overflow: hidden;
}

.connectionArrow {
    width: 16px;
    height: 16px;
    margin: 0px 8px;
    transition: 100ms ease margin;
}

@container (width < 300px) {
    .connectionArrow {
        margin: 0px 0px;
    }
}

.connectionSourceKey {
    color: var(--logo-green);
}

.connectionTargetKey {
    color: var(--logo-blue);
}

.connectionDelete {
    grid-row: 1;
    grid-column: 2;
    border-radius: 0px;
    border-top-right-radius: var(--connection-border-radius);
    border-bottom-right-radius: var(--connection-border-radius);
    background-color: #222;
    background-image: url(@/img/delete.svg);
    background-position: calc(50% + var(--connection-border-radius) / 2) 50%;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.connectionDelete:hover,
.connectionDelete:focus-visible {
    background-color: red !important;
    background-image: url(@/img/delete-dark.svg);
}

.connectionDivider {
    height: 2px;
    margin: 0px 12px;
    background-color: #555;
}

.connectionDivider:last-child {
    display: none;
}

.transformsConnectionHeader {
    margin: 8px 8px;
    border-bottom: 4px solid #555;
    background-color: #222;
    cursor: default;
}

.transformsConnectionHeader>div {
    border-radius: 6px;
}

.transformsConnectionHeader>div:hover {
    background-color: #333;
    /* outline: 2px solid cyan; */
}

.transformsContainer {
    display: flex;
    flex-direction: column;
}
</style>