<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import SidebarContentWrapper from '../SidebarContentWrapper.vue';
import TileEditItem from './TileEditItem.vue';

function resetHover() {
    TileEditor.state.sidebarHoverTile = null;
}
</script>

<template>
    <SidebarContentWrapper tab="edit">
        <template v-slot:header>Edit</template>
        <template v-slot:content>
            <TileEditItem :tile="TileEditor.root" root @mouseleave="resetHover"></TileEditItem>
        </template>
    </SidebarContentWrapper>
</template>

<style scoped></style>