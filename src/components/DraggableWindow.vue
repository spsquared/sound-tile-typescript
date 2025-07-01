<script setup lang="ts">
import { onClickOutside, useDraggable, useElementBounding, useThrottleFn } from '@vueuse/core';
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, useTemplateRef, watch } from 'vue';

const props = defineProps<{
    title: string
    minWidth?: number
    minHeight?: number
    resizeWidth?: boolean
    resizeHeight?: boolean
    resizeable?: boolean
    closeOnClickOut?: boolean
    borderColor?: string
}>();

const winBounds = useTemplateRef('winBounds');
const winContainer = useTemplateRef('winContainer');
const winBar = useTemplateRef('winBar');
const open = defineModel({ default: false });
const { x: dragX, y: dragY, style: dragStyle } = useDraggable(winContainer, {
    handle: winBar,
    containerElement: winBounds,
    preventDefault: true,
    onStart: () => { bringToTop(); },
    initialValue: { x: 100, y: 100 }
});
const size = reactive({ w: 300, h: 200 });
watch([() => props.minWidth, () => props.minHeight], () => {
    if (props.minWidth !== undefined && size.w < props.minWidth) size.w = props.minWidth;
    if (props.minHeight !== undefined && size.h < props.minHeight) size.h = props.minHeight;
}, { immediate: true });
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
watch(() => [props.resizeable, props.resizeWidth, props.resizeHeight], () => {
    if (!props.resizeable && !props.resizeWidth) size.w = props.minWidth ?? 300;
    if (!props.resizeable && !props.resizeHeight) size.h = props.minHeight ?? 200;
}, { immediate: true });

// window brought to top of other windows when clicked on
const isTop = ref(false);
async function bringToTop() {
    if (!open.value) return;
    topCounter.value++;
    await nextTick();
    isTop.value = true;
    (winBar.value?.querySelector('.windowClose') as HTMLElement)?.focus();
}
watch(topCounter, () => isTop.value = false);
watch(open, () => open.value && bringToTop());

// optionally close on clicking outside the window
onClickOutside(winContainer, () => {
    if (props.closeOnClickOut) open.value = false;
});

// a bunch of stuff I'll probably never use save that one obscure feature that does
const emit = defineEmits<{
    (e: 'open'): any
    (e: 'close'): any
    (e: 'move', x: number, y: number): any
    (e: 'resize', w: number, h: number): any
    (e: 'focus'): any
    (e: 'blur'): any
}>();
watch(open, () => emit(open.value ? 'open' : 'close' as any)); // typescript dumbness
watch([dragX, dragY], () => emit('move', dragX.value, dragY.value));
watch(size, () => emit('resize', size.w, size.h));
watch(isTop, () => emit(isTop.value ? 'focus' : 'blur' as any));
function fixDragPosition() {
    dragX.value = Math.min(window.innerWidth - size.w - 8, Math.max(dragX.value, 0));
    dragY.value = Math.min(window.innerHeight - size.h - 28, Math.max(dragY.value, 0));
}
defineExpose({
    posX: computed({ get: () => dragX.value, set: (x) => { dragX.value = x; fixDragPosition() } }),
    posY: computed({ get: () => dragY.value, set: (y) => { dragY.value = y; fixDragPosition() } }),
    width: computed({ get: () => size.w, set: (w) => { size.w = w; fixDragPosition(); } }),
    height: computed({ get: () => size.h, set: (h) => { size.h = h; fixDragPosition(); } }),
    open: () => open.value = true,
    close: () => open.value = false,
    focus: bringToTop
});
const fixPosOnResize = useThrottleFn(fixDragPosition, 100, true, true);
onMounted(() => window.addEventListener('resize', fixPosOnResize));
onUnmounted(() => window.removeEventListener('resize', fixPosOnResize));
</script>
<script lang="ts">
// janky thing for global - when counter increments all windows reset z-index
const topCounter = ref(0);
</script>

<template>
    <Teleport to="#root">
        <div class="window" ref="winContainer" v-if="open" :style="dragStyle" @mousedown="bringToTop">
            <div class="windowBar" ref="winBar">
                <span class="windowTitle">{{ props.title }}</span>
                <input type="button" class="windowClose" v-if="!props.closeOnClickOut" @click="open = false">
            </div>
            <div class="windowBody">
                <slot></slot>
            </div>
            <div class="windowResize reTop" v-if="props.resizeable || props.resizeHeight" @mousedown="beginResize(0b1000, $event)"></div>
            <div class="windowResize reBottom" v-if="props.resizeable || props.resizeHeight" @mousedown="beginResize(0b0100, $event)"></div>
            <div class="windowResize reLeft" v-if="props.resizeable || props.resizeWidth" @mousedown="beginResize(0b0010, $event)"></div>
            <div class="windowResize reRight" v-if="props.resizeable || props.resizeWidth" @mousedown="beginResize(0b0001, $event)"></div>
            <div class="windowResize rcTopLeft" v-if="props.resizeable || (props.resizeWidth && props.resizeHeight)" @mousedown="beginResize(0b1010, $event)"></div>
            <div class="windowResize rcTopRight" v-if="props.resizeable || (props.resizeWidth && props.resizeHeight)" @mousedown="beginResize(0b1001, $event)"></div>
            <div class="windowResize rcBottomLeft" v-if="props.resizeable || (props.resizeWidth && props.resizeHeight)" @mousedown="beginResize(0b0110, $event)"></div>
            <div class="windowResize rcBottomRight" v-if="props.resizeable || (props.resizeWidth && props.resizeHeight)" @mousedown="beginResize(0b0101, $event)"></div>
            <!-- window bounds in here to preserve ability to apply stuff to component from outside - only one div -->
            <div class="windowBounds" ref="winBounds" v-if="open"></div>
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
    z-index: v-bind("isTop ? 901 : 900");
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
    border: 4px solid v-bind("$props.borderColor ?? 'white'");
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