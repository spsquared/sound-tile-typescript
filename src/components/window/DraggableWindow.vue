<script setup lang="ts">
import { useDraggable, useElementBounding } from '@vueuse/core';
import { onMounted, onUnmounted, reactive, useTemplateRef } from 'vue';

const props = defineProps<{
    title: string
    minWidth?: number
    minHeight?: number
}>();

const winBounds = useTemplateRef('winBounds');
const winContainer = useTemplateRef('winContainer');
const winBar = useTemplateRef('winBar');
const open = defineModel({ default: false });
const { x: dragX, y: dragY, style: dragStyle } = useDraggable(winContainer, {
    handle: winBar,
    containerElement: winBounds,
    preventDefault: true,
    initialValue: { x: 100, y: 100 }
});
const size = reactive({ w: 300, h: 200 });
// spaghetti resize because VueUse doesn't have it
const boundingRect = useElementBounding(winContainer);
const resizeState = {
    top: false,
    bottom: false,
    left: false,
    right: false
};
function mouseMove(e: MouseEvent) {
    const minWidth = props.minWidth ?? 200;
    const minHeight = props.minHeight ?? 100;
    if (resizeState.top) {
        size.h = Math.min(boundingRect.bottom.value - 28, Math.max(minHeight, boundingRect.bottom.value - e.clientY - 28));
        dragY.value = Math.max(0, Math.min(boundingRect.bottom.value - size.h - 28, e.clientY));
        e.preventDefault();
    }
    if (resizeState.bottom) {
        size.h = Math.min(window.innerHeight - boundingRect.top.value - 28, Math.max(minHeight, e.clientY - dragY.value - 28));
        e.preventDefault();
    }
    if (resizeState.left) {
        size.w = Math.min(boundingRect.right.value, Math.max(minWidth, boundingRect.right.value - e.clientX - 8));
        dragX.value = Math.max(0, Math.min(boundingRect.right.value - size.w - 8, e.clientX));
        e.preventDefault();
    }
    if (resizeState.right) {
        size.w = Math.min(window.innerWidth - boundingRect.left.value - 8, Math.max(minWidth, e.clientX - dragX.value - 8));
        e.preventDefault();
    }
}
function beginResize(n: number, e: MouseEvent) {
    resizeState.top = (n & 0b1000) != 0;
    resizeState.bottom = (n & 0b0100) != 0;
    resizeState.left = (n & 0b0010) != 0;
    resizeState.right = (n & 0b0001) != 0;
    mouseMove(e);
}
function endResize() {
    resizeState.top = resizeState.bottom = resizeState.left = resizeState.right = false;
}
onMounted(() => {
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', endResize);
    document.addEventListener('blur', endResize);
});
onUnmounted(() => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('blur', endResize);
});
</script>

<template>
    <Teleport to="#root">
        <div class="windowBounds" ref="winBounds" v-if="open"></div>
        <div class="window" ref="winContainer" v-if="open" :style="dragStyle">
            <div class="windowBar" ref="winBar">
                <span class="windowTitle">{{ props.title }}</span>
                <input type="button" class="windowClose" @click="open = false">
            </div>
            <div class="windowBody">
                <slot></slot>
            </div>
            <div class="windowResize reTop" @mousedown="beginResize(0b1000, $event)"></div>
            <div class="windowResize reBottom" @mousedown="beginResize(0b0100, $event)"></div>
            <div class="windowResize reLeft" @mousedown="beginResize(0b0010, $event)"></div>
            <div class="windowResize reRight" @mousedown="beginResize(0b0001, $event)"></div>
            <div class="windowResize rcTopLeft" @mousedown="beginResize(0b1010, $event)"></div>
            <div class="windowResize rcTopRight" @mousedown="beginResize(0b1001, $event)"></div>
            <div class="windowResize rcBottomLeft" @mousedown="beginResize(0b0110, $event)"></div>
            <div class="windowResize rcBottomRight" @mousedown="beginResize(0b0101, $event)"></div>
        </div>
    </Teleport>
</template>

<style scoped>
.windowBounds {
    visibility: hidden;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
}

.window {
    display: grid;
    position: fixed;
    padding-top: 20px;
    z-index: 900;
}

.windowBar {
    box-sizing: border-box;
    display: flex;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 20px;
    border-radius: 8px 8px 0px 0px;
    flex-direction: row;
    background-color: #555;
    cursor: move;
    user-select: none;
}

.windowTitle {
    min-width: 0px;
    margin-left: 4px;
    flex: 1;
    flex-basis: 0px;
    font-size: 16px;
    text-wrap: nowrap;
    overflow: clip;
}

.windowClose {
    width: 16px;
    height: 16px;
    margin: 2px 2px;
    border-radius: 8px;
    background-color: red;
    background-image: url(@/img/close.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.windowClose:hover {
    background-color: tomato;
}

.windowClose:active {
    background-color: #D00;
}

.windowBody {
    contain: strict;
    border: 4px solid white;
    border-radius: 0px 0px 8px 8px;
    background-color: black;
    width: v-bind("size.w + 'px'");
    height: v-bind("size.h + 'px'");
    overflow: auto;
}

.windowResize {
    position: absolute;
}

.reTop,
.reBottom {
    top: -1px;
    left: 0px;
    width: 100%;
    height: 3px;
    cursor: ns-resize;
}

.reBottom {
    top: auto;
    bottom: -1px;
}

.reLeft,
.reRight {
    top: 0px;
    left: -1px;
    width: 3px;
    height: 100%;
    cursor: ew-resize;
}

.reRight {
    left: auto;
    right: -1px;
}

.rcTopLeft,
.rcTopRight,
.rcBottomLeft,
.rcBottomRight {
    top: -1px;
    left: -1px;
    width: 6px;
    height: 6px;
    cursor: nw-resize;
}

.rcTopRight {
    left: auto;
    right: -1px;
    cursor: ne-resize;
}

.rcBottomLeft,
.rcBottomRight {
    top: auto;
    bottom: -1px;
    cursor: sw-resize;
}

.rcBottomRight {
    left: auto;
    right: -1px;
    cursor: se-resize;
}
</style>