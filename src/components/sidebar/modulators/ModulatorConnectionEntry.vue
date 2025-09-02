<script setup lang="ts">
import { reactive, ref } from 'vue';
import Modulation from '@/visualizer/modulation';
import DraggableWindow from '@/components/DraggableWindow.vue';

const props = defineProps<{
    connection: Modulation.Connection
}>();

function disconnect() {
    console.warn('idk');
}

// took too much space
const windowOpen = ref(false);
</script>

<template>
    <div class="connectionEntry">
        <input type="button" class="connectionDelete" @click="disconnect">
        <div class="connectionLabel" @click="windowOpen = true">
            <div>{{ reactive(props.connection.source).label }} <span class="connectionSourceKey">[{{ props.connection.sourceKey }}]</span></div>
            <img src="@/img/arrow-right.svg" class="connectionArrow"></img>
            <div>{{ reactive(props.connection.target).label }} <span class="connectionTargetKey">[{{ props.connection.targetKey }}]</span></div>
        </div>
    </div>
    <div class="connectionDivider"></div>
    <DraggableWindow v-model="windowOpen" title="Transforms" :min-width="200" :min-height="200" resize-width close-on-click-out>
        <div class="connectionTransforms">
            <div class="transformItem" v-for="t, i in props.connection.transforms" :key="i">
                {{ t }}
            </div>
        </div>
    </DraggableWindow>
</template>

<style scoped>
.connectionEntry {
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
    grid-template-columns: 1fr 24px 1fr;
    min-height: 20px;
    align-items: center;
    padding: 2px 4px;
    border-radius: var(--connection-border-radius);
    column-gap: 2px;
    background-color: var(--mod-item-background-color);
    transition: 200ms ease transform;
    user-select: none;
    cursor: pointer;
}

.connectionEntry:hover>.connectionLabel {
    transform: translateX(-24px);
    background-color: #555;
    border-bottom-color: #777;
}

.connectionLabel>div {
    /* text-wrap: nowrap; */
    text-align: center;
    text-overflow: ellipsis;
}

.connectionArrow {
    width: 16px;
    height: 16px;
    margin: 0px 4px;
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

.connectionDelete:hover {
    background-color: red !important;
    background-image: url(@/img/delete-dark.svg);
}

.connectionDivider {
    width: calc(100% - 24px);
    height: 2px;
    margin: 0px 12px;
    background-color: #555;
}

.connectionDivider:last-child {
    display: none;
}

.connectionTransforms {
    display: flex;
    flex-direction: column;
}
</style>