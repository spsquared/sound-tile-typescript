<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    /**Minimum value */
    min?: number
    /**Maximum value */
    max?: number
    /**Quantization step */
    step?: number
    /**Length in CSS units of slider */
    length?: string
    /**Title */
    title?: string
    /**Track color */
    color1?: string
    /**Lower track color (track "before" slider thumb) */
    color2?: string
    /**Thumb color */
    color3?: string
    /**Thumb hover color */
    color4?: string
    /**Display the slider vertically */
    vertical?: boolean
    /**Width in CSS units of slider track */
    trackWidth?: string
    /**Border thickness on the ends of slider track */
    endBorderWidth?: string
    /**Border thickness on the sides of slider track */
    sideBorderWidth?: string
    /**Width in CSS units of slider thumb */
    thumbWidth?: string
    /**Length in CSS units of slider thumb */
    thumbLength?: string
    /**Edge radius in CSS units of slider thumb */
    thumbRadius?: string
    /**Multiplier for scrolling interaction speed of slider */
    scrollSpeed?: number
    /**Icon to display on slider thumb */
    icon?: string
    /**Size in CSS units of icon */
    iconSize?: string
    /**Disable input */
    disabled?: boolean
}>();
const value = defineModel({ default: 0 });

const emit = defineEmits<{
    (e: 'input', value: number): any
}>();

// scrollValue allows snapping to step while providing smooth control using scroll wheel
const scrollValue = ref(value.value);
function onWheel(e: WheelEvent) {
    // sideways scrolling often triggers nagivation and sucks on mice so we provide both options
    scrollValue.value = Math.max(props.min ?? -Infinity, Math.min(scrollValue.value - e.deltaY * (props.step ?? 1) * (props.scrollSpeed ?? 1), props.max ?? Infinity));
    if (!props.vertical) scrollValue.value = Math.max(props.min ?? -Infinity, Math.min(scrollValue.value + e.deltaX * (props.step ?? 1) * (props.scrollSpeed ?? 1), props.max ?? Infinity));
    if (props.step != undefined && props.step > 0) {
        value.value = Number((Math.round(scrollValue.value / props.step) * props.step).toFixed((props.step.toString().split('.')[1] ?? '').length));
        emit('input', value.value);
    } else {
        value.value = scrollValue.value;
        emit('input', value.value);
    }
    e.preventDefault();
}
function endWheel() {
    scrollValue.value = value.value;
}
watch(value, () => scrollValue.value = value.value);
</script>

<template>
    <label :class="{ slider: true, sliderVertical: props.vertical, sliderDisabled: props.disabled }">
        <input type="range" class="sliderInput" v-model="value" @input="emit('input', value)" @wheel="onWheel" @mouseleave="endWheel" :title="props.title" :min="props.min ?? 0" :max="props.max ?? 100" :step="props.step ?? 1" :disabled="disabled">
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

.sliderInput:active {
    cursor: grabbing;
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
    background-color: v-bind("$props.color3 ?? 'var(--input-color)'");
    background-image: v-bind('$props.icon !== undefined ? `url("${$props.icon}")` : ``');
    background-position: center;
    background-size: v-bind("$props.iconSize ?? '80% 80%'");
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

.sliderInput:focus-visible+.sliderTrack+.sliderThumbWrapper>.sliderThumb {
    outline: 2px solid white;
    outline-offset: -2px;
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