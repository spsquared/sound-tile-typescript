<script setup lang="ts">
import Modulation from '@/visualizer/modulation';
import ModulatorConnectionEntry from './ModulatorConnectionEntry.vue';
import { computed, ComputedRef, ref, useTemplateRef, watch } from 'vue';
import { useElementSize, useMouseInElement } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import { Tile } from '@/visualizer/tiles';

const props = defineProps<{
    type: 'source' | 'target'
    label: string
    tile: Tile | null;
    connections: Modulation.Connection[]
    modulationKeys: string[]
}>();

// targets open drag and drop list when user is dragging a source and any part of the item is hovered over
const modItem = useTemplateRef('modItem');
const modDragDropdown = useTemplateRef('modDragDropdown');
const dropdownId = dropdownIdCounter++;
const dragOpenDropdown = props.type == 'source' ? ref(false) : (() => {
    // dont do a bunch of garbage when not dragging (it adds up) also terrible name lol
    const modItem2 = computed(() => TileEditor.modulatorDrag.source !== null ? modItem.value : null);
    const modDragDropdown2 = computed(() => TileEditor.modulatorDrag.source !== null ? modDragDropdown.value : null);
    const { isOutside: outsideA } = useMouseInElement(modItem2);
    const { isOutside: outsideB } = useMouseInElement(modDragDropdown2);
    const hovered = computed(() => (!outsideA.value || !outsideB.value) && TileEditor.modulatorDrag.source !== null);
    watch([hovered, currentOpenDropdown], () => {
        if (hovered.value) currentOpenDropdown.value ??= dropdownId;
        else if (currentOpenDropdown.value === dropdownId) currentOpenDropdown.value = null;
    });
    return computed(() => currentOpenDropdown.value == dropdownId);
})();
defineExpose({
    dragOpenDropdown: dragOpenDropdown as ComputedRef<boolean>
});

const dragItems = useTemplateRef('modDragItems');
const { height: dragItemsHeight } = useElementSize(dragItems);
</script>
<script lang="ts">
// MORE JANK!!!
// make sure only one dropdown is open at a time for the drag-and-drop jank
const currentOpenDropdown = ref<number | null>(null);
let dropdownIdCounter = 0;
</script>

<template>
    <div :class="{
        modItem: true,
        modItemIdentify: TileEditor.state.editWindowIdentifyTile === (props.tile ?? 1) /* diff type */
    }" ref="modItem">
        <div class="modLabel">{{ props.label }}</div>
        <div :class="{ modDragContainer: true, modDragContainerAlwaysOpen: dragOpenDropdown }">
            <div class="modDragDropdown" ref="modDragDropdown">
                <div class="modDragDropdownBorder"></div>
                <div class="modDragDropdownHeader">{{ props.type == 'source' ? 'Sources' : 'Targets' }}</div>
                <div class="modDragItems" ref="modDragItems">
                    <div v-for="key in props.modulationKeys" class="modDragItem">
                        <div>{{ key }}</div>
                        <slot :name="key"></slot>
                    </div>
                </div>
            </div>
            <div class="modDragIcon"></div>
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

.modItem:hover {
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
.modDragContainerAlwaysOpen {
    /* appear above other things */
    z-index: 2;
}

.modDragContainer:hover>.modDragDropdown,
.modDragContainerAlwaysOpen>.modDragDropdown {
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
    /* newest at top */
    flex-direction: column-reverse;
    row-gap: 3px;
}
</style>