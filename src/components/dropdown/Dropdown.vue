<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { copyright } from '@/constants';
import FullscreenModal, { ModalMode } from '@/components/util/FullscreenModal.vue';
import TileEditor from '@/visualizer/editor';
import DropdownFileControls from './DropdownFileControls.vue';
import DropdownMediaData from './DropdownMediaData.vue';
import DropdownMediaControls from './DropdownMediaControls.vue';
import DropdownEditControls from './DropdownEditControls.vue';

function keypress(e: KeyboardEvent) {
    if (e.target instanceof HTMLElement && e.target.matches('input[type=text],input[type=number]')) return;
    if (e.key.toLowerCase() == 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.shiftKey) {
            TileEditor.state.dropdownOpen = false;
            TileEditor.state.sidebarOpen = false;
            TileEditor.state.hideTabs = true;
        } else {
            TileEditor.state.dropdownOpen = !TileEditor.state.dropdownOpen;
            TileEditor.state.hideTabs = false;
        }
    }
}
onMounted(() => document.addEventListener('keypress', keypress));
onUnmounted(() => document.removeEventListener('keypress', keypress));

// removes animating of sidebar spacer width when resizing
const animateSpacer = ref(false);
let timeout: NodeJS.Timeout = setTimeout(() => {});
watch(() => TileEditor.state.sidebarOpen, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => animateSpacer.value = false, 200);
    animateSpacer.value = true;
});

const showCopyright = ref(false);
</script>

<template>
    <input type="checkbox" id="dropdownToggle" v-model="TileEditor.state.dropdownOpen" checked>
    <div id="dropdown">
        <div id="dropdownBody">
            <img src="@/img/logo.png" id="dropdownLogo" :title="copyright" @click="showCopyright = true">
            <DropdownFileControls></DropdownFileControls>
            <DropdownMediaData></DropdownMediaData>
            <DropdownMediaControls></DropdownMediaControls>
            <DropdownEditControls></DropdownEditControls>
            <input type="checkbox" id="sidebarShadowToggle" v-model="TileEditor.state.sidebarOpen">
            <div id="sidebarSpacer"></div>
        </div>
        <label id="dropdownTab" for="dropdownToggle" title="Toggle dropdown (H)" v-show="!TileEditor.state.hideTabs"></label>
    </div>
    <FullscreenModal title="Sound Tile" :mode="ModalMode.NOTIFY" v-model="showCopyright">
        <b>{{ copyright }} under GNU GPL 3.0</b>
        <br>
        Source code is available on GitHub at
        <br>
        <a href="https://github.com/spsquared/sound-tile-typescript">github.com/spsquared/sound-tile-typescript</a>
    </FullscreenModal>
</template>

<style scoped>
#dropdownToggle,
#sidebarShadowToggle {
    display: none;
}

#dropdown {
    contain: size;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 120px;
    border-bottom: 4px solid white;
    background-color: black;
    line-height: 1;
    transition: 200ms ease transform;
    transform: translateY(-124px);
    z-index: 500;
}

#dropdownToggle:checked+#dropdown {
    transform: translateY(0px);

}

#dropdownBody {
    display: flex;
    container-type: size;
    width: 100vw;
    height: 120px;
    flex-direction: row;
}

#dropdownTab {
    position: absolute;
    bottom: -40px;
    left: 0px;
    width: 32px;
    height: 32px;
    background-color: black;
    border: 4px solid white;
    border-top: 0px;
    cursor: pointer;
    background-image: url(@/img/arrow-down.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

#dropdownToggle:checked+#dropdown>#dropdownTab {
    background-image: url(@/img/arrow-up.svg);
}

#dropdownLogo {
    height: 120px;
    cursor: pointer;
}

#sidebarSpacer {
    min-width: 0px;
    transition: v-bind("animateSpacer ? '200ms ease min-width' : ''");
}

#sidebarShadowToggle:checked+#sidebarSpacer {
    min-width: max(v-bind("TileEditor.state.sidebarScreenWidth + 'vw'"), v-bind("TileEditor.state.minSidebarWidthPx + 'px'"));
}
</style>