<script setup lang="ts">
const color = defineModel({ default: '#FFFFFF' });
</script>

<template>
    <input type="color" class="colorInput" v-model="color">
</template>

<style scoped>
.colorInput {
    appearance: none;
    position: relative;
    margin: 0px 0px;
    padding: 0px 0px;
    border: none;
    border-radius: 0px;
    background-color: transparent;
    cursor: pointer;
}

.colorInput::-webkit-color-swatch {
    appearance: none;
    box-sizing: border-box;
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    margin: 0px 0px;
    padding: 0px 0px;
    border: 2px solid white;
    border-radius: 0;
}
</style>