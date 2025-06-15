<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    min?: number
    max?: number
    step?: number
    length?: string
    title?: string
    color1?: string
    color2?: string
    color3?: string
    color4?: string
    vertical?: boolean
    trackWidth?: string
    endBorderWidth?: string
    sideBorderWidth?: string
    thumbWidth?: string
    thumbLength?: string
    thumbRadius?: string
    icon?: string
    disabled?: boolean
}>();
const value = defineModel({ default: 0 });

const emit = defineEmits<{
    (e: 'input', value: number): any
}>();

// scrollValue allows snapping to step while providing smooth control using scroll wheel
const scrollValue = ref(value.value);
function onWheel(e: WheelEvent) {
    if (props.vertical) {
        scrollValue.value = Math.max(props.min ?? -Infinity, Math.min(scrollValue.value - e.deltaY * (props.step ?? 1), props.max ?? Infinity));
    } else {
        scrollValue.value = Math.max(props.min ?? -Infinity, Math.min(scrollValue.value - e.deltaX * (props.step ?? 1), props.max ?? Infinity));
    }
    if (props.step != undefined && props.step > 0) {
        value.value = Number((Math.round(scrollValue.value / props.step) * props.step).toFixed((props.step.toString().split('.')[1] ?? '').length));
        emit('input', value.value);
    } else {
        value.value = scrollValue.value;
        emit('input', value.value);
    }
}
function endWheel() {
    scrollValue.value = value.value;
}
</script>

<template>
    <label :class="{ slider: true, sliderVertical: props.vertical, sliderDisabled: props.disabled }">
        <input type="range" class="sliderInput" v-model="value" @input="emit('input', value)" @wheel.passive="onWheel" @mouseleave="endWheel" :title="props.title" :min="props.min ?? 0" :max="props.max ?? 100" :step="props.step ?? 1" :disabled="disabled">
        <div class="sliderTrack"></div>
        <div class="sliderThumbWrapper">
            <div class="sliderThumb"></div>
        </div>
    </label>
</template>

<style scoped>
.slider {
    display: inline-block;
    position: relative;
    vertical-align: top;
    max-width: min-content;
    max-height: min-content;
    --length: v-bind("$props.length ?? 'unset'");
    --progress: v-bind("(value - ($props.min ?? 0)) / ($props.max ?? 100)");
    --track-width: v-bind("$props.trackWidth ?? '8px'");
    --thumb-width: v-bind("$props.thumbWidth ?? '20px'");
    --thumb-length: v-bind("$props.thumbLength ?? '10px'");
    --thumb-radius: v-bind("$props.thumbRadius ?? '2px'");
    --side-borders: v-bind("$props.sideBorderWidth ?? '1px'");
    --end-borders: v-bind("$props.endBorderWidth ?? '1px'");
}

.sliderInput {
    display: block;
    appearance: none;
    width: calc(var(--length) - var(--end-borders) * 2);
    height: var(--thumb-width);
    border: 0px;
    margin: 0px var(--end-borders);
    opacity: 0;
    cursor: grab;
}

.sliderVertical>.sliderInput {
    writing-mode: vertical-rl;
    direction: rtl;
    width: var(--thumb-width);
    height: calc(var(--length) - var(--end-borders) * 2);
    margin: var(--end-borders) 0px;
}

.sliderTrack {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: calc(100% - var(--end-borders) * 2);
    height: var(--track-width);
    border: solid white;
    border-top-width: var(--side-borders);
    border-bottom-width: var(--side-borders);
    border-left-width: var(--end-borders);
    border-right-width: var(--end-borders);
    background-color: v-bind("$props.color1 ?? '#333'");
    pointer-events: none;
}

.sliderVertical>.sliderTrack {
    width: v-bind("$props.trackWidth ?? '8px'");
    height: calc(100% - var(--end-borders) * 2);
    border-top-width: var(--end-borders);
    border-bottom-width: var(--end-borders);
    border-left-width: var(--side-borders);
    border-right-width: var(--side-borders);
}

.sliderInput::-webkit-slider-thumb {
    appearance: none;
    width: var(--thumb-length);
    height: var(--thumb-length);
}

.sliderThumbWrapper {
    position: absolute;
    top: 0px;
    left: var(--end-borders);
    width: calc(100% - var(--end-borders) * 2);
    height: 100%;
    overflow: clip;
    pointer-events: none;
}

.sliderVertical>.sliderThumbWrapper {
    top: var(--end-borders);
    left: 0px;
    width: 100%;
    height: calc(100% - var(--end-borders) * 2);
}

.sliderThumb {
    position: absolute;
    bottom: 0px;
    left: calc(var(--progress) * (100% - var(--thumb-length)));
    width: var(--thumb-length);
    height: var(--thumb-width);
    border-radius: var(--thumb-radius);
    transition: 50ms linear background-color;
    background-color: v-bind("$props.color3 ?? 'var(--input-color)'");
    background-image: v-bind('`url("${$props.icon}")`');
    background-position: center;
    background-size: 80% 80%;
}

.sliderThumb::before {
    content: '';
    background-color: v-bind("$props.color2 ?? 'dodgerblue'");
    position: absolute;
    top: calc((var(--thumb-width) - var(--track-width)) / 2);
    right: var(--thumb-length);
    width: 1000000vw;
    height: var(--track-width);
}

.slider:hover .sliderThumb {
    background-color: v-bind("$props.color4 ?? 'var(--input-hover-color)'");
}

.sliderVertical .sliderThumb {
    bottom: calc(var(--progress) * (100% - var(--thumb-length)));
    left: 0px;
    width: var(--thumb-width);
    height: var(--thumb-length);
}

.sliderVertical .sliderThumb::before {
    left: calc((var(--thumb-width) - var(--track-width)) / 2);
    top: var(--thumb-length);
    width: var(--track-width);
    height: 1000000vw;
}

.sliderInput:active {
    cursor: grabbing;
}

.sliderDisabled>.sliderTrack {
    border-color: #555 !important;
}

.sliderDisabled>.sliderInput {
    filter: saturate(0.5);
}

.sliderInput:disabled {
    cursor: not-allowed;
}
</style>