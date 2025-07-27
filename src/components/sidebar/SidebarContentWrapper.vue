<script setup lang="ts">
import TileEditor from '@/visualizer/editor';

const props = defineProps<{
    tab: typeof TileEditor.state.sidebarTab
}>();
</script>

<template>
    <Transition>
        <div class="sidebarContentWrapper" v-if="TileEditor.state.sidebarTab == props.tab">
            <div class="sidebarHeader">
                <slot name="header"></slot>
            </div>
            <div class="sidebarContent">
                <slot name="content"></slot>
            </div>
        </div>
    </Transition>
    <!-- without this div the transition doesn't work -->
    <div></div>
</template>

<style scoped>
.sidebarContentWrapper {
    contain: layout size;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: min-content 1fr;
    grid-auto-flow: row;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    transition: 200ms linear transform;
}

.sidebarHeader {
    background-color: #333;
    padding: 4px 4px;
    border-bottom: 4px solid white;
    font-size: 18px;
    transition: 200ms ease transform;
    text-align: center;
}

.sidebarContent {
    padding: 4px 4px;
    transition: 200ms ease transform;
    overflow: auto;
}

.v-enter-from>.sidebarHeader,
.v-enter-from>.sidebarContent {
    transform: translateX(100%);
}

.v-leave-to>.sidebarHeader,
.v-leave-to>.sidebarContent {
    transform: translateX(-100%);
}

.v-enter-to>.sidebarHeader,
.v-leave-from>.sidebarHeader,
.v-enter-to>.sidebarContent,
.v-leave-from>.sidebarContent {
    transform: translateX(0px);
}
</style>