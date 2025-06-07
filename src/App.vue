<script setup lang="ts">
import { reactive } from 'vue';
import FullscreenModal, { ModalMode } from '@/components/window/FullscreenModal.vue';
import Dropdown from '@/components/dropdown/Dropdown.vue';
import TileRoot from '@/components/main/TileRoot.vue';
import TileDrag from '@/components/main/TileDrag.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';

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