<script setup lang="ts">
import Modulation from '@/visualizer/modulation';

const props = defineProps<{
    connection: Modulation.Connection
}>();
</script>

<template>
    <div class="connectionEntry">
        <input type="button" class="connectionDelete">
        <div class="connectionHeader">
            <div>{{ props.connection.source.label }} [{{ props.connection.sourceKey }}]</div>
            <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
            <div>{{ props.connection.target.label }} [{{ props.connection.targetKey }}]</div>
        </div>
        <div class="connectionTransforms">
            <div class="transformItem" v-for="t, i in props.connection.transforms" :key="i">
                {{ t }}
            </div>
        </div>
    </div>
</template>

<style scoped>
.connectionEntry {
    --connection-border-radius: 6px;
    display: grid;
    grid-template-rows: 24px 1fr;
    grid-template-columns: 1fr calc(24px + var(--connection-border-radius));
    margin-left: 32px;
}

.connectionHeader {
    grid-row: 1;
    grid-column: 1 / 3;
    display: grid;
    grid-template-rows: 16px;
    grid-template-columns: 1fr 24px 1fr;
    height: 16px;
    padding: 2px 4px;
    border-bottom: 4px solid #555;
    border-top-left-radius: var(--connection-border-radius);
    border-top-right-radius: var(--connection-border-radius);
    column-gap: 2px;
    background-color: var(--mod-item-background-color);
    transition: 200ms ease transform;
    user-select: none;
}

.connectionHeader>div {
    text-wrap: nowrap;
    text-overflow: ellipsis;
}

.connectionArrow {
    width: 16px;
    height: 16px;
    margin: 0px 4px;
}

.connectionDelete {
    grid-row: 1;
    grid-column: 2;
    border-radius: 0px;
    border-top-right-radius: var(--connection-border-radius);
    border-bottom-right-radius: var(--connection-border-radius);
    background-color: var(--mod-item-background-color);
    background-image: url(@/img/delete.svg);
    background-position: calc(50% + var(--connection-border-radius) / 2) 50%;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.connectionDelete:hover {
    background-color: red !important;
    background-image: url(@/img/delete-dark.svg);
}

.connectionTransforms {
    grid-row: 2;
    grid-column: 1 / 3;
    display: flex;
    flex-direction: column;
    border-bottom-left-radius: var(--connection-border-radius);
    border-bottom-right-radius: var(--connection-border-radius);
}

.connectionEntry:hover {
    .connectionHeader {
        transform: translateX(-24px);
        background-color: #555;
        border-bottom-color: #777;
    }

    .connectionDelete {
        background-color: #222;
    }

    .connectionTransforms {
        background-color: #555;
    }
}
</style>