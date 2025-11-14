<script setup lang="ts">
import { ref } from 'vue';

const idk = ref(false);
</script>

<template>
    <div id="idkModeToggleContainer">
        <label button id="idkModeA" for="idkModeToggle" title="Tile view" :disabled="!idk"></label>
        <label button id="idkModeB" for="idkModeToggle" title="Tree view" :disabled="idk"></label>
        <input type="checkbox" id="idkModeToggle" v-model="idk">
        <div id="idkModeToggleSlider"></div>
        <div id="idkModeAImg"></div>
        <div id="idkModeBImg"></div>
    </div>
</template>

<style scoped>

#idkModeToggleContainer {
    display: grid;
    grid-template-rows: 60px 60px;
    border-left: 4px solid white;
}

#idkModeToggle {
    display: none;
}

#idkModeA,
#idkModeB {
    width: 58px;
    height: 58px;
    border-radius: 0px;
    background-color: #333;
}

#idkModeA:hover,
#idkModeB:hover {
    background-color: #444;
}

#idkModeA[disabled=true],
#idkModeB[disabled=true] {
    cursor: default;
}

#idkModeAImg,
#idkModeBImg {
    width: 58px;
    height: 58px;
    /* transform fixes layering (transform displays on top of non-transformed) */
    transform: translateY(0px);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
    pointer-events: none;
}

#idkModeA,
#idkModeAImg {
    grid-row: 1;
    grid-column: 1;
    border-bottom: 2px solid white;
}

#idkModeB,
#idkModeBImg {
    grid-row: 2;
    grid-column: 1;
    border-top: 2px solid white;
}

#idkModeAImg {
    background-image: url(@/img/close.svg);
}

#idkModeBImg {
    background-image: url(@/img/close.svg);
}

#idkModeToggleSlider {
    grid-row: 1;
    grid-column: 1;
    width: 58px;
    height: 58px;
    background-color: #070;
    transition: 100ms linear transform;
    transform: translateY(0px);
    pointer-events: none;
}

#idkModeToggle:checked+#idkModeToggleSlider {
    transform: translateY(62px);
}

#idkModeToggleContainer::after {
    content: '';
    position: absolute;
    top: 58px;
    width: 58px;
    height: 4px;
    background-color: white;
    pointer-events: none;
}
</style>