<script setup lang="ts">
import { ref } from 'vue';
import { copyright } from '@/constants';
import FullscreenModal, { ModalMode } from '#/util/FullscreenModal.vue';
import DropdownMediaData from './DropdownMediaData.vue';
import DropdownMediaControls from './DropdownMediaControls.vue';
import DropdownEditControls from './DropdownEditControls.vue';

// dropdown
const open = ref(true);
const hideTab = ref(false);
document.addEventListener('keypress', (e) => {
    if (e.key.toLowerCase() == 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        open.value = !open.value;
        hideTab.value = !open.value && e.shiftKey;
    }
});

const showCopyright = ref(false);
</script>

<template>
    <input type="checkbox" id="dropdownToggle" v-model="open" checked>
    <div id="dropdown">
        <div id="dropdownBody">
            <img src="@/img/logo.png" id="dropdownLogo" :title="copyright" @click="() => showCopyright = true">
            <div id="fileControls">
                <input type="file" id="tileUpload">
                <input type="button" id="tileDownload">
            </div>
            <DropdownMediaData></DropdownMediaData>
            <DropdownMediaControls></DropdownMediaControls>
            <DropdownEditControls></DropdownEditControls>
        </div>
        <label id="dropdownTab" for="dropdownToggle" title="Toggle dropdown (H)" v-show="!hideTab"></label>
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
#dropdownToggle {
    display: none;
}

#dropdown {
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

#fileControls {
    position: relative;
    display: flex;
    flex-direction: column;
    border-left: 4px solid white;
}

#fileControls>input {
    box-sizing: content-box;
    appearance: none;
    width: 58px;
    height: 60px;
    margin: 0px;
    padding: 0px;
    border-radius: 0px;
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

#tileUpload {
    border-bottom: 2px solid white;
    background-image: url(@/img/upload.svg);
}

#tileUpload::-webkit-file-upload-button {
    visibility: hidden;
}

#tileDownload {
    height: 60px;
    border-top: 2px solid white;
    background-image: url(@/img/download.svg);
}

#fileControls::after {
    content: '';
    position: absolute;
    top: 58px;
    width: 58px;
    height: 4px;
    background-color: white;
    pointer-events: none;
}
</style>