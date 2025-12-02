<script setup lang="ts">
import { inject, ref, ShallowRef, useTemplateRef, watch } from 'vue';
import { useElementSize } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import Modulation from '@/visualizer/modulation';
import { Tile } from '@/visualizer/tiles';
import ModulatorConnectionEntry from './ModulatorConnectionEntry.vue';

const props = defineProps<{
    type: 'source' | 'target'
    label: string
    tile: Tile | null;
    connections: Modulation.Connection[]
    modulationKeys: string[]
    noIdentify?: boolean
}>();

// targets open drag and drop list when user is dragging a source and any part of the item is hovered over
const modItem = useTemplateRef('modItem');
const modDragScrollAnchor = useTemplateRef('modDragScrollAnchor');
const dragHovering = ref(false);
if (props.type == 'target') {
    const hoveredElement = inject<ShallowRef<Element | null>>('modulatorHoveredElement');
    if (hoveredElement === undefined) throw new Error('ModulatorItem target missing modulatorHoveredElement injection!');
    watch([hoveredElement, () => TileEditor.modulatorDrag.source], () => {
        dragHovering.value = (modItem.value?.contains(hoveredElement.value) ?? false) && TileEditor.modulatorDrag.source !== null;
        // sometimes the items are cut off and scrolling can't be done while drag-and-drop is active
        if (dragHovering.value) modDragScrollAnchor.value?.scrollIntoView({ behavior: 'smooth' });
    });
}

const dragItems = useTemplateRef('modDragItems');
const { height: dragItemsHeight } = useElementSize(dragItems);

function setIdentifyTile(v: boolean) {
    if (props.tile === null || props.noIdentify) return;
    if (v) TileEditor.state.identifyTilesSidebar.add(props.tile);
    else TileEditor.state.identifyTilesSidebar.delete(props.tile);
}
</script>

<template>
    <div :class="{
        modItem: true,
        modItemIdentify: props.tile !== null && TileEditor.state.identifyTilesLayout.has(props.tile),
        modItemDragHovering: dragHovering
    }" ref="modItem" :title="props.tile !== null ? `Tile associated with source: ${props.label}` : `Source: ${props.label}`" @mouseenter="setIdentifyTile(true)" @mouseleave="setIdentifyTile(false)">
        <div class="modLabel">{{ props.label }}</div>
        <div class="modDragContainer">
            <div class="modDragDropdown">
                <div class="modDragScrollAnchor" ref="modDragScrollAnchor"></div>
                <div class="modDragItems" ref="modDragItems">
                    <div class="modDragItem" v-for="key in props.modulationKeys">
                        <div>{{ key }}</div>
                        <slot :name="key"></slot>
                    </div>
                </div>
                <div class="modDragDropdownBorder"></div>
                <div class="modDragDropdownHeader">{{ props.type == 'source' ? 'Sources' : 'Targets' }}</div>
            </div>
            <div class="modDragIcon" tabindex="0"></div>
        </div>
        <div class="modConnections" v-if="props.connections.length > 0">
            <ModulatorConnectionEntry v-for="c, i in props.connections" :key="i" :connection="c" :type="props.type"></ModulatorConnectionEntry>
        </div>
    </div>
</template>

<style scoped>
.modItem {
    display: grid;
    grid-template-rows: 24px;
    grid-template-columns: 1fr min-content;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    padding: 4px 4px;
    gap: 4px;
    --mod-item-background-color: #222;
    background-color: var(--mod-item-background-color);
}

.modItem:hover,
.modItemDragHovering {
    --mod-item-background-color: #333;
}

.modItemIdentify {
    outline: 2px solid cyan;
}

.modLabel {
    grid-row: 1;
    grid-column: 1;
    min-width: 0px;
    align-content: center;
    /* let users copy labels if needed */
    /* user-select: none; */
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
}

.modDragContainer {
    grid-row: 1;
    grid-column: 2;
    position: relative;
    width: 48px;
    height: 24px;
    --mod-drag-color: v-bind("$props.type == 'source' ? 'var(--logo-green)' : 'var(--logo-blue)'");
    --mod-dropdown-width: 200px;
    /* another thing that has to stay on top of connections */
    z-index: 1;
}

.modDragIcon {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    border-radius: 6px;
    background-color: var(--mod-drag-color);
    background-image: url(@/img/dropdown-dark.svg);
    background-position: center;
    background-size: 60% 60%;
    background-repeat: no-repeat;
}

.modDragDropdown {
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    right: 0px;
    min-width: 100%;
    min-height: 100%;
    border-radius: 6px;
    background-color: #555;
    transition: 200ms ease min-width, 200ms ease min-height;
    overflow: clip;
}

.modDragContainer:hover,
.modDragContainer:focus-within,
.modItemDragHovering>.modDragContainer {
    /* appear above other things */
    z-index: 2;
}

.modDragContainer:hover>.modDragDropdown,
.modDragContainer:focus-within>.modDragDropdown,
.modItemDragHovering>.modDragContainer>.modDragDropdown {
    min-width: var(--mod-dropdown-width);
    min-height: v-bind("dragItemsHeight + 44 + 'px'");
    /* 24px header + 4px border + 8px padding x2 */
}

.modDragDropdownHeader {
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    right: 0px;
    width: var(--mod-dropdown-width);
    height: 24px;
    padding: 0px 8px;
    border-radius: 6px;
    background-color: color-mix(in hsl, var(--mod-drag-color) 80%, black 20%);
    align-content: center;
    user-select: none;
}

.modDragDropdownBorder {
    /* yes we need separate border so the border follows the thing */
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    right: 0px;
    width: 100%;
    height: 100%;
    border: 4px solid white;
    border-top: none;
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
    /* border is on top (intentionally, so animation looks better) */
    pointer-events: none;
}

.modDragScrollAnchor {
    position: absolute;
    /* 44px to account for header and 16px more so scrolling up is possible */
    top: -60px;
    height: v-bind("dragItemsHeight + 'px'");
}

.modDragItems {
    display: grid;
    grid-template-columns: 1fr min-content;
    grid-auto-rows: 1fr;
    grid-auto-flow: row;
    box-sizing: border-box;
    position: absolute;
    top: 24px;
    right: 0px;
    width: var(--mod-dropdown-width);
    padding: 8px 4px;
    gap: 8px;
}

.modDragItem {
    grid-column: span 2;
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: subgrid;
    padding: 0px 8px;
    align-items: center;
    text-wrap: nowrap;
    text-overflow: ellipsis;
}

.modConnections {
    grid-row: 2;
    grid-column: 1 / 3;
    display: flex;
    flex-direction: column;
    row-gap: 3px;
}
</style>