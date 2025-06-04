<script setup lang="ts">
</script>

<template>
    <div id="fileControls">
        <input type="file" id="tileUpload" title="Load Tiles from computer">
        <input type="button" id="tileDownload" title="Save Tiles to computer">
    </div>
</template>

<style scoped>
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