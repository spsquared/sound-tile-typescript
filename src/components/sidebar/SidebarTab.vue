<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { inject, ref, Ref } from 'vue';

const props = defineProps<{
    for: string
    image: string
}>();

const currentTab = inject('sidebarCurrentTab') as Ref<string> ?? ref('');

function set() {
    currentTab.value = props.for;
    TileEditor.state.sidebarOpen = true;
}
</script>

<template>
    <button :class="{ sidebarTab: true, sidebarTabSelected: currentTab == props.for }" @click="set()"></button>
</template>

<style scoped>
.sidebarTab {
    position: relative;
    box-sizing: content-box;
    width: 32px;
    height: 32px;
    margin: 0px 0px;
    padding: 0px 0px;
    border: 2px solid white;
    border-right: none;
    border-left-width: 4px;
    border-radius: 0px;
    background-color: #333;
    cursor: pointer;
    background-image: v-bind('`url("${$props.image}")`');
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.sidebarTab:first-child {
    border-top-width: 4px;
}

.sidebarTab:last-child {
    border-bottom-width: 4px;
}

.sidebarTabSelected {
    background-color: black;
}

.sidebarTabSelected::after {
    content: '';
    position: absolute;
    top: 0px;
    right: -4px;
    width: 4px;
    height: 32px;
    background-color: #333;
    pointer-events: none;
}
</style>