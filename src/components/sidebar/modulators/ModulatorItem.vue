<script setup lang="ts">
import Modulation from '@/visualizer/modulation';
import ModulatorConnectionEntry from './ModulatorConnectionEntry.vue';

const props = defineProps<{
    label: string
    connections: Modulation.Connection[]
}>();
</script>

<template>
    <div class="modItem">
        <div class="modLabel">{{ props.label }}</div>
        <div class="modHeaderItems">
            <slot></slot>
        </div>
        <div class="modConnections">
            <ModulatorConnectionEntry v-for="c, i in props.connections" :key="i" :connection="c"></ModulatorConnectionEntry>
        </div>
    </div>
</template>

<style scoped>
.modItem {
    display: grid;
    grid-template-rows: 20px 1fr;
    grid-template-columns: 1fr min-content;
    padding: 4px 4px;
    gap: 4px;
    --mod-item-background-color: #222;
    background-color: var(--mod-item-background-color);
}

.modItem:hover {
    --mod-item-background-color: #333;
}

.modLabel {
    grid-row: 1;
    grid-column: 1;
    /* let users copy labels if needed */
    /* user-select: none; */
}

.modHeaderItems {
    grid-row: 1;
    grid-column: 2;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.modConnections {
    grid-row: 2;
    grid-column: 1 / 3;
    display: flex;
    /* newest at top */
    flex-direction: column-reverse;
    row-gap: 2px;
}
</style>