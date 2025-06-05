<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import SidebarContentWrapper from './SidebarContentWrapper.vue';
import TileEditItem from './tileEdit/TileEditItem.vue';

function resetHover() {
    TileEditor.state.sidebarHoverTile = null;
}
</script>

<template>
    <SidebarContentWrapper tab="edit">
        <template v-slot:header>Edit</template>
        <template v-slot:content>
            <div @mouseleave="resetHover()">
                <TileEditItem :tile="TileEditor.root" root></TileEditItem>
            </div>
        </template>
    </SidebarContentWrapper>
</template>

<style scoped></style>