<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import SidebarContentWrapper from '../SidebarContentWrapper.vue';
import TileEditItem from './TileEditItem.vue';

function resetHover() {
    TileEditor.state.sidebarIdentifyTile = null;
}
</script>

<template>
    <SidebarContentWrapper tab="edit">
        <template v-slot:header>Edit</template>
        <template v-slot:content>
            <div id="tileEditUndoControls">
                <input type="button" id="tileEditUndo" @click="TileEditor.undoLayoutChange()">
                <input type="button" id="tileEditRedo" @click="TileEditor.redoLayoutChange()">
            </div>
            <TileEditItem :tile="TileEditor.root" root @mouseleave="resetHover"></TileEditItem>
        </template>
    </SidebarContentWrapper>
</template>

<style scoped>
#tileEditUndoControls {
    position: sticky;
    display: flex;
    flex-direction: row;
    width: 100%;
    margin-bottom: 4px;
    gap: 4px;
}

#tileEditUndo,
#tileEditRedo {
    background-color: #333;
    flex-grow: 1;
    background-size: 100% 100%;
    background-position: center;
    background-repeat: no-repeat;
}

#tileEditUndo:hover,
#tileEditRedo:hover {
    background-color: #444;
}

#tileEditUndo {
    background-image: url(@/img/undo.svg);
}

#tileEditRedo {
    background-image: url(@/img/redo.svg);
}
</style>