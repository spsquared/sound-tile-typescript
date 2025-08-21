<script setup lang="ts">
import { inject, onMounted, onUnmounted, Ref, ref, watch } from 'vue';
import { copyright, matchTextInput } from '@/constants';
import TileEditor from '@/visualizer/editor';
import DropdownFileControls from './DropdownFileControls.vue';
import DropdownMediaData from './DropdownMediaData.vue';
import DropdownMediaControls from './DropdownMediaControls.vue';
import DropdownEditControls from './DropdownEditControls.vue';

function keydown(e: KeyboardEvent) {
    if (matchTextInput(e.target)) return;
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
onMounted(() => document.addEventListener('keydown', keydown));
onUnmounted(() => document.removeEventListener('keydown', keydown));

// removes animating of sidebar spacer width when resizing
const animateSpacer = ref(false);
let timeout: NodeJS.Timeout = setTimeout(() => { });
watch(() => TileEditor.state.sidebarOpen, () => {
    clearTimeout(timeout);
    timeout = setTimeout(() => animateSpacer.value = false, 200);
    animateSpacer.value = true;
});

const showAppInfo = inject<Ref<boolean>>('showAppInfoRef', ref(false));
</script>

<template>
    <input type="checkbox" id="dropdownToggle" v-model="TileEditor.state.dropdownOpen" checked>
    <div id="dropdown">
        <div id="dropdownBody" :inert="!TileEditor.state.dropdownOpen">
            <img src="/logo.png" id="dropdownLogo" :title="copyright" @click="showAppInfo = true">
            <DropdownFileControls></DropdownFileControls>
            <DropdownMediaData></DropdownMediaData>
            <DropdownMediaControls></DropdownMediaControls>
            <DropdownEditControls></DropdownEditControls>
            <input type="checkbox" id="sidebarShadowToggle" v-model="TileEditor.state.sidebarOpen">
            <div id="sidebarSpacer"></div>
        </div>
        <Transition>
            <label button id="dropdownTab" for="dropdownToggle" title="Toggle dropdown (H)" tabindex="0" v-show="!TileEditor.state.hideTabs && !TileEditor.state.idleHideTabs"></label>
        </Transition>
    </div>
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
    flex-direction: row;
    container-type: size;
    width: 100vw;
    height: 120px;
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
    border-radius: 0px;
    cursor: pointer;
    background-image: url(@/img/arrow-down.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    transition: 200ms linear opacity;
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

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-enter-to,
.v-leave-from {
    opacity: 1;
}
</style>