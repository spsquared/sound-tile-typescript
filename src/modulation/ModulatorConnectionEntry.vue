<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import TileEditor from '@/visualizer/editor';
import { Tile } from '@/visualizer/tiles';
import Modulation from '@/visualizer/modulation';
import DraggableWindow from '@/components/DraggableWindow.vue';
import ModulatorConnectionTransformItem from './ModulatorConnectionTransformItem.vue';

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
        transformsWindow.value.height = 300;
        transformsWindow.value.posX = rect.left - 412; // borders + margin
        transformsWindow.value.posY = rect.top;
        transformsWindow.value.focus();
    }
}

const transformAddType = ref<keyof typeof Modulation.TransformTypes>('constant');
function addTransform() {
    const transform = Modulation.TransformTypes[transformAddType.value];
    // no abstract stuff here its probably fine
    props.connection.transforms.push(new (transform as any)());
}
function moveTransformUp(i: number) {
    const t = props.connection.transforms[i - 1];
    props.connection.transforms[i - 1] = props.connection.transforms[i];
    props.connection.transforms[i] = t;
}
function moveTransformDown(i: number) {
    const t = props.connection.transforms[i + 1];
    props.connection.transforms[i + 1] = props.connection.transforms[i];
    props.connection.transforms[i] = t;
}
function deleteTransform(i: number) {
    props.connection.transforms.splice(i, 1);
}

function setIdentifyTile(tile: Tile | null, v: boolean) {
    if (tile === null) return;
    if (v) TileEditor.state.identifyTilesSidebar.add(tile);
    else TileEditor.state.identifyTilesSidebar.delete(tile);
}
</script>

<template>
    <div class="connectionEntry" :title="`Edit transforms for connection ${props.connection.source.tile?.label ?? props.connection.source.label} [${props.connection.sourceKey}] > ${props.connection.target.tile?.label ?? props.connection.target.label} [${props.connection.targetKey}]`">
        <input type="button" class="connectionDelete" title="Disconnect modulation" @click="disconnect">
        <div class="connectionLabel" ref="connectionLabel" @click="openWindow">
            <div>
                <span v-if="props.type != 'source'">{{ props.connection.source.tile?.label ?? props.connection.source.label + ' ' }}</span>
                <span v-else>This</span>
                <span class="connectionSourceKey">&ensp;[{{ props.connection.sourceKey }}]</span>
            </div>
            <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
            <div>
                <span v-if="props.type != 'target'">{{ props.connection.target.tile?.label ?? props.connection.target.label + ' ' }}</span>
                <span v-else>This</span>
                <span class="connectionTargetKey">&ensp;[{{ props.connection.targetKey }}]</span>
            </div>
        </div>
    </div>
    <div class="connectionDivider"></div>
    <DraggableWindow v-model="windowOpen" ref="transformsWindow" title="Transforms" :min-width="400" :min-height="200" resize-height close-on-click-out>
        <div class="transformsWindow">
            <div class="connectionLabel transformsConnectionHeader">
                <div :title="`Source: ${props.connection.source.tile?.label ?? props.connection.source.label} [${props.connection.sourceKey}]`" @mouseenter="setIdentifyTile(props.connection.source.tile, true)" @mouseleave="setIdentifyTile(props.connection.source.tile, false)">
                    {{ props.connection.source.tile?.label ?? props.connection.source.label }}
                    <span class="connectionSourceKey">[{{ props.connection.sourceKey }}]</span>
                </div>
                <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
                <div :title="`Target: ${props.connection.target.tile?.label ?? props.connection.target.label} [${props.connection.targetKey}]`" @mouseenter="setIdentifyTile(props.connection.target.tile, true)" @mouseleave="setIdentifyTile(props.connection.target.tile, false)">
                    {{ props.connection.target.tile?.label ?? props.connection.target.label }}
                    <span class="connectionTargetKey">[{{ props.connection.targetKey }}]</span>
                </div>
            </div>
            <div class="transformsContainer">
                <!-- hard-coded inputs and outputs to make clearer the direction of the transform chain -->
                <div class="transformItem transformItemIO" title="The input value to the transform chain coming from the source">
                    <div class="transformItemIndex">0</div>
                    <div class="transformItemIOLabel" style="color: var(--logo-green);">Input</div>
                    <div class="transformItemIOTag" @mouseenter="setIdentifyTile(props.connection.source.tile, true)" @mouseleave="setIdentifyTile(props.connection.source.tile, false)"></div>
                </div>
                <div class="transformItem" v-for="t, i in props.connection.transforms" :key="i">
                    <div class="transformItemIndex">{{ i + 1 }}</div>
                    <ModulatorConnectionTransformItem :transform="t"></ModulatorConnectionTransformItem>
                    <input type="button" class="transformItemMoveUp" @click="moveTransformUp(i)" :disabled="i == 0">
                    <input type="button" class="transformItemMoveDown" @click="moveTransformDown(i)" :disabled="i == props.connection.transforms.length - 1">
                    <input type="button" class="transformItemDelete" @click="deleteTransform(i)">
                </div>
                <div class="transformItem transformItemIO" title="The output leaving the transform chain to the target">
                    <div class="transformItemIndex">{{ props.connection.transforms.length + 1 }}</div>
                    <div class="transformItemIOLabel" style="color: var(--logo-blue);">Output</div>
                    <div class="transformItemIOTag" @mouseenter="setIdentifyTile(props.connection.target.tile, true)" @mouseleave="setIdentifyTile(props.connection.target.tile, false)"></div>
                </div>
            </div>
            <div class="transformsAddContainer">
                <select class="transformsAddType" v-model="transformAddType" title="Choose function for modulation transform" v-once>
                    <option v-for="transform in Modulation.TransformTypes" :value="transform.type">{{ transform.transformName }}</option>
                </select>
                <input type="button" class="transformsAddButton" value="+" title="Add the chosen transform function" @click="addTransform">
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

.transformsWindow {
    box-sizing: border-box;
    display: grid;
    grid-template-rows: min-content 1fr min-content;
    grid-template-columns: 1fr;
    width: 100%;
    height: 100%;
    padding: 8px 8px;
    row-gap: 8px;
}

.transformsConnectionHeader {
    grid-row: 1;
    grid-column: 1;
    border-bottom: 4px solid #555;
    background-color: #222;
    cursor: default;
}

.transformsConnectionHeader>div {
    border-radius: 6px;
    align-self: stretch;
    align-content: center;
}

.transformsConnectionHeader>div:hover {
    background-color: #333;
}

.transformsContainer {
    grid-row: 2;
    grid-column: 1;
    display: flex;
    flex-direction: column;
    min-height: 0px;
    padding: 4px 4px;
    border: 4px solid #555;
    row-gap: 4px;
    overflow: auto;
}

.transformItem {
    display: grid;
    grid-template-columns: min-content 1fr 26px;
    grid-template-rows: 24px 24px 24px;
    grid-template-areas: "index item move-up" "index item move-down" "index item delete";
    border: 2px solid white;
    column-gap: 4px;
}

.transformItemIndex {
    grid-area: index;
    padding-left: 4px;
    font-size: 18px;
    align-content: center;
    text-align: center;
    user-select: none;
}

.transformItemMoveUp,
.transformItemMoveDown,
.transformItemDelete {
    width: 26px;
    height: 24px;
    border-left: 2px solid white;
    border-radius: 0px;
    background-position: center;
    background-size: 60% 60%;
    background-repeat: no-repeat;
    outline-offset: -4px;
}

.transformItemMoveUp {
    grid-area: move-up;
    background-image: url(@/img/arrow-up.svg);
}

.transformItemMoveDown {
    grid-area: move-down;
    background-image: url(@/img/arrow-down.svg);
}

.transformItemDelete {
    grid-area: delete;
    border-top: 2px solid white;
    background-image: url(@/img/delete.svg);
    background-size: 90% 90%;
}

.transformItemDelete:hover {
    background-color: red;
    background-image: url(@/img/delete-dark.svg);
}

.transformItemIO {
    grid-template-rows: 24px;
    grid-template-areas: "index item tag";
}

.transformItemIOLabel {
    grid-area: item;
    text-align: center;
    user-select: none;
}

.transformItemIOTag {
    grid-area: tag;
    width: 24px;
    height: 24px;
    border-left: 2px solid white;
    background-color: var(--input-disabled-color);
    background-image: url(@/img/modulation.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.transformItemIOTag:hover {
    /* outline otherwise goes weird */
    margin-left: 2px;
    border-left: none;
    outline: 2px solid cyan;
}

.transformsAddContainer {
    grid-row: 3;
    grid-column: 1;
    display: flex;
    flex-direction: row;
    column-gap: 4px;
}

.transformsAddType {
    text-align: center;
    flex-grow: 2;
}

.transformsAddButton {
    flex-grow: 1;
    padding: 0px;
    font-size: 20px;
    line-height: 1em;
}
</style>