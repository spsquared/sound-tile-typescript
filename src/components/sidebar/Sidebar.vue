<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { matchTextInput } from '@/constants';
import TileEditor from '@/visualizer/editor';
import SidebarTileEdit from './tileEdit/SidebarTileEdit.vue';
import SidebarModulators from './modulators/SidebarModulators.vue';
import SidebarExport from './export/SidebarExport.vue';
import SidebarPlaylist from './playlist/SidebarPlaylist.vue';
import SidebarTab from './SidebarTab.vue';
import editIcon from '@/img/edit.svg';
import modulationIcon from '@/img/modulation.svg';
import exportIcon from '@/img/export.svg';
import playlistIcon from '@/img/playlist.svg';

function keydown(e: KeyboardEvent) {
    if (matchTextInput(e.target)) return;
    if (e.key.toLowerCase() == 'e' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.shiftKey) {
            TileEditor.state.dropdownOpen = false;
            TileEditor.state.sidebarOpen = false;
            TileEditor.state.hideTabs = true;
        } else {
            TileEditor.state.sidebarOpen = !TileEditor.state.sidebarOpen;
            TileEditor.state.hideTabs = false;
        }
        endResize();
    }
}
onMounted(() => document.addEventListener('keydown', keydown));
onUnmounted(() => document.removeEventListener('keydown', keydown));

let resizing = false;
function mouseMove(e: MouseEvent) {
    if (!resizing) return;
    TileEditor.state.sidebarScreenWidth = 100 * (1 - Math.max(0, e.clientX / window.innerWidth));
    e.preventDefault();
}
function beginResize(e: MouseEvent) {
    resizing = true;
    mouseMove(e);
}
function endResize() {
    resizing = false;
}
onMounted(() => {
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', endResize);
    document.addEventListener('blur', endResize);
});
onUnmounted(() => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('blur', endResize);
});
</script>

<template>
    <input type="checkbox" id="sidebarToggle" v-model="TileEditor.state.sidebarOpen">
    <div id="sidebar">
        <SidebarTileEdit></SidebarTileEdit>
        <SidebarModulators></SidebarModulators>
        <SidebarExport></SidebarExport>
        <SidebarPlaylist></SidebarPlaylist>
        <input type="checkbox" id="dropdownShadowToggle" v-model="TileEditor.state.dropdownOpen">
        <Transition>
            <div id="sidebarTabs" v-show="!TileEditor.state.hideTabs && !TileEditor.state.idleHideTabs">
                <label button id="sidebarToggleTab" for="sidebarToggle" title="Toggle sidebar (E)" tabindex="0"></label>
                <div id="sidebarTabsList">
                    <SidebarTab for="edit" :image="editIcon" title="Edit Tiles" size="70%"></SidebarTab>
                    <SidebarTab for="modulators" :image="modulationIcon" title="Edit Modulators"></SidebarTab>
                    <SidebarTab for="export" :image="exportIcon" title="Export"></SidebarTab>
                    <SidebarTab for="playlist" :image="playlistIcon" size="90%" title="Playlist"></SidebarTab>
                </div>
            </div>
        </Transition>
        <div id="sidebarResize" @mousedown="beginResize"></div>
    </div>
</template>

<style scoped>
#sidebarToggle,
#dropdownShadowToggle {
    display: none;
}

#sidebar {
    box-sizing: border-box;
    position: fixed;
    top: 0px;
    right: 0px;
    width: var(--sidebar-width);
    height: 100vh;
    border-left: 4px solid white;
    background-color: black;
    transition: 200ms ease transform;
    transform: translateX(100%);
    z-index: 600;
    --sidebar-width: max(v-bind("TileEditor.state.sidebarScreenWidth + 'vw'"), v-bind("TileEditor.state.minSidebarWidthPx + 'px'"));
}

#sidebarToggle:checked+#sidebar {
    transform: translateX(0px);
}

#sidebarHeader {
    background-color: blue;
}

#sidebarTabs {
    position: absolute;
    left: -40px;
    top: 24px;
    transition: 200ms ease transform, 200ms linear opacity;
    transform: translateY(0px);
}

#dropdownShadowToggle:checked+#sidebarTabs {
    transform: translateY(124px);
}

#sidebarToggleTab {
    display: flex;
    flex-direction: column;
    width: 32px;
    height: 32px;
    margin-bottom: 8px;
    border: 4px solid white;
    border-right: none;
    border-radius: 0px;
    background-color: black;
    cursor: pointer;
    background-image: url(@/img/arrow-left.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

#sidebarToggle:checked+#sidebar #sidebarToggleTab {
    background-image: url(@/img/arrow-right.svg);
}

#sidebarTabsList {
    display: flex;
    flex-direction: column;
}

#sidebarResize {
    position: absolute;
    top: 0px;
    left: -4px;
    width: 4px;
    height: 100vh;
    cursor: ew-resize;
    /* fixes random selecting when resizing */
    user-select: none;
}

#sidebarResize:active::after {
    content: ' ';
    /* covers entire screen to keep block cursor interactions while dragging */
    position: fixed;
    top: 0px;
    left: -100vw;
    width: 200vw;
    height: 100vh;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-enter-to,
.v-leave-from {
    opacity: 1;
}
</style>