<script setup lang="ts">
import { provide, ref } from 'vue';
import { copyright, dreamberd, reloadPage, repositoryURL, version } from '@/constants';
import FullscreenModal from '@/components/FullscreenModal.vue';
import Dropdown from '@/dropdown/Dropdown.vue';
import Sidebar from '@/sidebar/Sidebar.vue';
import TileRoot from './TileRoot.vue';
import TileDrag from './TileDrag.vue';
import ModulatorDrag from './ModulatorDrag.vue';
import PerformanceStats from './PerformanceStats.vue';
import TutorialMaster from './TutorialMaster.vue';
import PatchNotes from './PatchNotes.vue';
import ErrorQueue from './ErrorQueue.vue';

provide('showAppInfoRef', showAppInfo);
provide('showPatchNotesRef', showPatchNotes);
provide('showNewVersionNoticeRef', showNewVersionNotice);
</script>
<script lang="ts">
export const showAppInfo = ref(false);
export const showPatchNotes = ref(false);
export const showNewVersionNotice = ref(false);
export const newVersionReload = ref(false);
export const newVersionNumber = ref('');
</script>

<template>
    <Dropdown></Dropdown>
    <Sidebar></Sidebar>
    <TileRoot></TileRoot>
    <TileDrag></TileDrag>
    <ModulatorDrag></ModulatorDrag>
    <PerformanceStats></PerformanceStats>
    <TutorialMaster></TutorialMaster>
    <FullscreenModal v-model="showAppInfo" mode="info" effect="frost-window">
        <template #title>
            <div class="appInfoTitle">
                <img src="/logo-border.png"></img>
                <span style="grid-area: title;">Sound Tile</span>
                <span style="grid-area: version; padding-right: 0.2em; font-size: 0.5em; font-weight: normal;">v{{ version }}</span>
            </div>
        </template>
        <template #default>
            <b>{{ copyright }} under <a href="https://www.gnu.org/licenses/gpl-3.0-standalone.html" target="_blank" style="color: white;">GNU GPL 3.0</a></b>
            <br>
            <span>Source code is available on GitHub at</span>
            <br>
            <a :href="repositoryURL" target="_blank">{{ repositoryURL }}</a>
            <br>
            <span style="font-size: 8px;">{{ dreamberd }}</span>
        </template>
        <template #buttons=opts>
            <input type="button" value="PATCH NOTES" class="patchNotesButton" @click="() => { opts.close(true); showPatchNotes = true }"></input>
        </template>
    </FullscreenModal>
    <FullscreenModal v-model="showNewVersionNotice" :title="newVersionReload ? 'New Version Available!' : 'Updated Sound Tile!'" mode="info" effect="frost-window">
        <template #default>
            <template v-if="newVersionReload">
                A new version of Sound Tile is available: v{{ newVersionNumber }}
                <br>
                You can <a href="">Reload</a> to use the new version now!
            </template>
            <template v-else>
                Sound Tile has been updated to v{{ version }}
            </template>
        </template>
        <template #buttons=opts>
            <input v-if="newVersionReload" type="button" value="RELOAD" class="reloadButton" @click="() => { opts.close(true); reloadPage(); }"></input>
            <input v-else type="button" value="PATCH NOTES" class="patchNotesButton" @click="() => { opts.close(true); showPatchNotes = true; }"></input>
        </template>
    </FullscreenModal>
    <FullscreenModal v-model="showPatchNotes" title="Patch Notes" mode="info" effect="frost-screen">
        <Suspense>
            <PatchNotes #default></PatchNotes>
            <template #fallback>
                Using JIT bugfixing...
                <span v-if="Math.random() < 0.01" v-once>Hi {{ ['Maitian', 'Dad', 'Mom', 'Lemon', 'dragoncoder047'][Math.floor(Math.random() * 5)] }}!</span>
                <!-- suspense probably wont change enough to be a problem -->
            </template>
        </Suspense>
    </FullscreenModal>
    <ErrorQueue></ErrorQueue>
</template>

<style scoped>
.reloadButton,
.patchNotesButton {
    height: 32px;
    border: 4px solid white;
    border-radius: 2px;
    margin: 0px 4px;
    color: white;
    font-size: 16px;
    transition: 50ms linear transform;
    transform: translateY(0px);
    cursor: pointer;
}

.reloadButton {
    background-color: #555;
}

.patchNotesButton {
    background-color: var(--logo-blue);
}

.reloadButton:hover,
.patchNotesButton:hover {
    transform: translateY(-2px);
}

.reloadButton:active,
.patchNotesButton:active {
    transform: translateY(2px);
}

.appInfoTitle {
    display: grid;
    grid-template-rows: 1em 0.5em;
    grid-template-columns: 1fr min-content min-content 1fr;
    grid-template-areas: "a logo title b" "a logo version b";
    column-gap: 0.3em;
    user-select: none;
}

.appInfoTitle>img {
    grid-area: logo;
    height: 1.5em;
}

.appInfoTitle>span {
    line-height: 1em;
    text-wrap: nowrap;
    text-align: right;
}
</style>