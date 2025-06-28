<script setup lang="ts">
import { ref, useTemplateRef } from 'vue';
import arrowDownIcon from '@/img/arrow-down.svg';
import arrowRightIcon from '@/img/arrow-right.svg';
import { useElementSize } from '@vueuse/core';

const props = defineProps<{
    title: string
}>();

const open = ref(true);

const bodyEl = useTemplateRef('body');
const { height } = useElementSize(bodyEl);
</script>

<template>
    <div class="optSection">
        <label class="optSectionHeader">
            <input type="checkbox" v-model="open">
            <div class="optSectionHeaderIcon"></div>
            <div class="optSectionHeaderText">{{ props.title }}</div>
        </label>
        <Transition>
            <div class="optSectionBodyWrapper" v-show="open">
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
    transition: 50ms linear background-color;
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
    min-height: v-bind("height + 'px'");
    padding: 4px 0px;
    overflow: hidden;
}

.optSectionBody {
    box-sizing: border-box;
    display: flex;
    flex-wrap: wrap;
    position: absolute;
    row-gap: 4px;
    column-gap: 12px;
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