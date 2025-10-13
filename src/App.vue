<script setup lang="ts">
import { provide, reactive, ref } from 'vue';
import { copyright, dreamberd, version } from '@/constants';
import FullscreenModal from '@/components/FullscreenModal.vue';
import Dropdown from '@/components/dropdown/Dropdown.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';
import TileRoot from '@/components/main/TileRoot.vue';
import TileDrag from '@/components/main/TileDrag.vue';
import ModulatorDrag from './components/main/ModulatorDrag.vue';
import TutorialMaster from './components/main/TutorialMaster.vue';

const showAppInfo = ref(false);
provide('showAppInfoRef', showAppInfo);

// error message mostly works except some cases where error event isn't triggered (workers for example)
const errorInfo = reactive({
    message: '',
    filename: '',
    lineno: 0,
    colno: 0,
    open: false
});
window.addEventListener('error', (e) => {
    errorInfo.message = e.message;
    errorInfo.filename = e.filename;
    errorInfo.lineno = e.lineno;
    errorInfo.colno = e.colno;
    errorInfo.open = true;
});
window.addEventListener('unhandledrejection', (e) => {
    errorInfo.message = 'Unhandled Promise rejection: ' + (() => {
        if (e.reason != null) {
            if (e.reason.toString != Object.prototype.toString && typeof e.reason.toString == 'function') return e.reason.toString();
            return JSON.stringify(e.reason);
        }
        return e.reason;
    })();
    errorInfo.filename = 'Unknown';
    errorInfo.lineno = 0;
    errorInfo.lineno = 0;
    errorInfo.open = true;
});
</script>

<template>
    <Dropdown></Dropdown>
    <Sidebar></Sidebar>
    <TileRoot></TileRoot>
    <TileDrag></TileDrag>
    <ModulatorDrag></ModulatorDrag>
    <TutorialMaster></TutorialMaster>
    <FullscreenModal v-model="showAppInfo" :title="`Sound Tile v${version}`" mode="notify" effect="frost-window">
        <b>{{ copyright }} under GNU GPL 3.0</b>
        <br>
        Source code is available on GitHub at
        <br>
        <a href="https://github.com/spsquared/sound-tile-typescript" target="_blank">github.com/spsquared/sound-tile-typescript</a>
        <br>
        <span style="font-size: 8px;">{{ dreamberd }}</span>
    </FullscreenModal>
    <FullscreenModal v-model="errorInfo.open" title="An Error Occured" mode="notify" color="red">
        <div style="color: red;">
            An unexpected error occured:
            <br>
            {{ errorInfo.message }}
            <br>
            {{ errorInfo.filename }} {{ errorInfo.lineno }}:{{ errorInfo.colno }}
        </div>
    </FullscreenModal>
</template>

<style></style>