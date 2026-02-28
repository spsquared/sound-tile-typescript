<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import arrowDownIcon from '@/img/arrow-down.svg';
import arrowRightIcon from '@/img/arrow-right.svg';
import { useElementSize } from '@vueuse/core';

const props = defineProps<{
    title: string
}>();

const open = ref(true);

const wrapperEl = useTemplateRef('wrapper');
const bodyEl = useTemplateRef('body');
const { height } = useElementSize(bodyEl);
watch(height, (h) => requestAnimationFrame(() => wrapperEl.value != null && (wrapperEl.value.style.height = h + 'px')));
</script>

<template>
    <div class="optSection">
        <label class="optSectionHeader">
            <input type="checkbox" v-model="open">
            <div class="optSectionHeaderIcon"></div>
            <div class="optSectionHeaderText">{{ props.title }}</div>
        </label>
        <Transition>
            <div class="optSectionBodyWrapper" v-show="open" ref="wrapper">
                <div class="optSectionBody" ref="body">
                    <slot></slot>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.optSection {
    margin: 8px 8px;
    margin-top: 0px;
}

.optSection:first-child {
    margin-top: 8px;
}

.optSectionHeader {
    display: flex;
    border-bottom: 4px solid #555;
    background-color: #222;
    cursor: pointer;
    user-select: none;
}

.optSectionHeader:hover {
    background-color: #333;
}

.optSectionHeader>input {
    display: none;
}

.optSectionHeaderIcon {
    width: 20px;
    height: 20px;
    background-image: v-bind('open ? `url("${arrowDownIcon}")` : `url("${arrowRightIcon}")`');
    background-position: center;
    background-size: 70% 70%;
    background-repeat: no-repeat;
}

.optSectionHeaderText {
    margin-left: 4px;
    font-size: 18px;
    line-height: 1em;
    align-content: center;
}

.optSectionBodyWrapper {
    position: relative;
    /* binding removed to avoid infinite loop */
    padding: 4px 0px;
    overflow: clip;
}

.optSectionBody {
    box-sizing: border-box;
    position: absolute;
    width: 100%;
    padding: 0px 4px;
}

.v-enter-active,
.v-leave-active {
    transition: 100ms ease min-height;
}

.v-enter-from,
.v-leave-to {
    min-height: 0px;
}

.v-enter-active>.optSectionBody,
.v-leave-active>.optSectionBody {
    transition: 100ms ease transform;
}

.v-enter-from>.optSectionBody,
.v-leave-to>.optSectionBody {
    transform: translateY(-100%);
}

.v-enter-to>.optSectionBody,
.v-leave-from>.optSectionBody {
    transform: translateY(0px);
}
</style>