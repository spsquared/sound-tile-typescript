<script setup lang="ts">
</script>

<template>
    <div id="fileControls">
        <input type="button" id="tileUpload" title="Load Tiles from computer">
        <input type="button" id="tileDownload" title="Save Tiles to computer">
    </div>
</template>

<style scoped>
#fileControls {
    position: relative;
    display: grid;
    grid-template-columns: 58px;
    grid-template-rows: 58px 4px 48px;
    flex-direction: column;
    border-left: 4px solid white;
}

#fileControls>input {
    box-sizing: content-box;
    appearance: none;
    width: 58px;
    height: 58px;
    margin: 0px;
    padding: 0px;
    border-radius: 0px;
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    outline-offset: -2px;
    outline-color: black;
}

#tileUpload {
    grid-row: 1;
    background-image: url(@/img/upload.svg);
}

#tileUpload::-webkit-file-upload-button {
    visibility: hidden;
}

#tileDownload {
    grid-row: 3;
    background-image: url(@/img/download.svg);
}

#fileControls::after {
    content: '';
    grid-row: 2;
    height: 4px;
    background-color: white;
    pointer-events: none;
}
</style>