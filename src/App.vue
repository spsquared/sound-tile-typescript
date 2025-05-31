<script setup lang="ts">
import { reactive } from 'vue';
import Dropdown from '#/dropdown/Dropdown.vue';
import FullscreenModal, { ModalMode } from '#/util/FullscreenModal.vue';

const errorInf = reactive({
    message: '',
    filename: '',
    lineno: 0,
    colno: 0
})
window.addEventListener('error', (e) => {
    errorInf.message = e.message;
    errorInf.filename = e.filename;
    errorInf.lineno = e.lineno;
    errorInf.colno = e.colno;
});
</script>

<template>
    <Dropdown></Dropdown>
    <FullscreenModal title="An Error Occured" :mode="ModalMode.NOTIFY" color="red">
        <div style="color: red;">
            An unexpected error occured:
            <br>
            {{ errorInf.message }}
            <br>
            {{ errorInf.filename }} {{ errorInf.lineno }}:{{ errorInf.colno }}
        </div>
    </FullscreenModal>
</template>

<style></style>