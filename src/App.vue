<script setup lang="ts">
import { provide, reactive, ref } from 'vue';
import { copyright, dreamberd, version } from '@/constants';
import FullscreenModal, { ModalMode } from '@/components/FullscreenModal.vue';
import Dropdown from '@/components/dropdown/Dropdown.vue';
import TileRoot from '@/components/main/TileRoot.vue';
import TileDrag from '@/components/main/TileDrag.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';

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
</script>

<template>
    <Dropdown></Dropdown>
    <TileRoot></TileRoot>
    <TileDrag></TileDrag>
    <Sidebar></Sidebar>
    <FullscreenModal :title="`Sound Tile v${version}`" :mode="ModalMode.NOTIFY" v-model="showAppInfo">
        <b>{{ copyright }} under GNU GPL 3.0</b>
        <br>
        Source code is available on GitHub at
        <br>
        <a href="https://github.com/spsquared/sound-tile-typescript" target="_blank">github.com/spsquared/sound-tile-typescript</a>
        <br>
        <span style="font-size: 8px;">{{ dreamberd }}</span>
    </FullscreenModal>
    <FullscreenModal title="An Error Occured" :mode="ModalMode.NOTIFY" color="red" v-model="errorInfo.open">
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