<script setup lang="ts">
import { provide, ref } from 'vue';
import { copyright, dreamberd, repositoryURL, version } from '@/constants';
import FullscreenModal from '@/components/FullscreenModal.vue';
import Dropdown from '@/components/dropdown/Dropdown.vue';
import Sidebar from '@/components/sidebar/Sidebar.vue';
import TileRoot from '@/components/main/TileRoot.vue';
import TileDrag from '@/components/main/TileDrag.vue';
import ModulatorDrag from './components/main/ModulatorDrag.vue';
import TutorialMaster from './components/main/TutorialMaster.vue';
import ErrorQueue from './components/main/ErrorQueue.vue';

const showAppInfo = ref(false);
provide('showAppInfoRef', showAppInfo);
</script>

<template>
    <Dropdown></Dropdown>
    <Sidebar></Sidebar>
    <TileRoot></TileRoot>
    <TileDrag></TileDrag>
    <ModulatorDrag></ModulatorDrag>
    <TutorialMaster></TutorialMaster>
    <FullscreenModal v-model="showAppInfo" :title="`Sound Tile v${version}`" mode="notify" effect="frost-window">
        <b>{{ copyright }} under <a href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank" style="color: white;">GNU GPL 3.0</a></b>
        <br>
        Source code is available on GitHub at
        <br>
        <a :href="repositoryURL" target="_blank">{{ repositoryURL }}</a>
        <br>
        <span style="font-size: 8px;">{{ dreamberd }}</span>
    </FullscreenModal>
    <ErrorQueue></ErrorQueue>
</template>

<style></style>