<script setup lang="ts">
import Modulation from '@/visualizer/modulation';
import ModulatorConnectionEntry from './ModulatorConnectionEntry.vue';

const props = defineProps<{
    index: number
    connection: Modulation.Connection
}>();
</script>

<template>
    <div class="connectionItem">
        <div class="connectionIndex">{{ props.index + 1 }}</div>
        <div class="connectionWrapper">
            <ModulatorConnectionEntry :connection="props.connection" type="standalone"></ModulatorConnectionEntry>
        </div>
    </div>
</template>

<style scoped>
.connectionItem {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 24px 1fr;
    --mod-item-background-color: #222;
    background-color: #333;
    border-radius: 6px;
}

.connectionIndex {
    grid-row: 1;
    grid-column: 1;
    align-content: center;
    text-align: center;
    user-select: none;
}

.connectionWrapper {
    grid-row: 1;
    grid-column: 1 / 3;
}
</style>