<script setup lang="ts">
import { computed, useTemplateRef, watch } from 'vue';
import { syncRef, useEyeDropper } from '@vueuse/core';
import DraggableWindow from '@/components/DraggableWindow.vue';
import ColorPicker, { ColorData } from './colorPicker';
import StrictNumberInput from './StrictNumberInput.vue';
import ColorInput from './ColorInput.vue';

const props = defineProps<{
    picker?: ColorPicker
    badgeWidth?: string
    badgeHeight?: string
    disabled?: boolean
}>();

const colorData = defineModel<ColorData>({
    default: { type: 'solid', color: '#FFFFFF', alpha: 1 }
});

// can either supply a picker instance directly or use implicit one (if conversions from json format aren't needed outside)
const picker = props.picker !== undefined ? props.picker : ColorPicker.createReactive(colorData.value);
syncRef(computed({
    get: () => picker.colorData,
    set: (color) => picker.colorData = color
}), colorData);

const pickerWindow = useTemplateRef('pickerWindow');
const pickerBadge = useTemplateRef('pickerBadge');

// clicking on badge to close triggers close on click off but immediately reopens due to badge click
let recentlyClosed = false;
function fudgeBadgeClickClose() {
    recentlyClosed = true;
    setTimeout(() => recentlyClosed = false, 10);
}
function togglePicker() {
    if (props.disabled || recentlyClosed) return;
    picker.open = !picker.open;
    if (pickerWindow.value !== null && pickerBadge.value !== null && picker.open) {
        const rect = pickerBadge.value.getBoundingClientRect();
        pickerWindow.value.posX = rect.left;
        pickerWindow.value.posY = rect.top - 268;
        pickerWindow.value.focus();
    }
}
watch(() => props.disabled, () => {
    if (props.disabled) picker.open = false;
});

const eyedropper = useEyeDropper();
async function runEyedropperSolid() {
    const res = await eyedropper.open();
    if (res !== undefined) picker.solidData.color = res.sRGBHex;
}
async function runEyedropperStop(i: number) {
    const res = await eyedropper.open();
    if (res !== undefined) {
        const stop = picker.gradientData.stops[i];
        if (stop !== undefined) stop.c = res.sRGBHex;
    }
}

function addStop() {
    picker.gradientData.stops.push({ t: 0, c: '#FFFFFF', a: 1 });
}
function moveStopUp(i: number) {
    if (i == 0) return;
    picker.gradientData.stops.splice(i - 1, 0, ...picker.gradientData.stops.splice(i, 1));
}
function moveStopDown(i: number) {
    if (i == picker.gradientData.stops.length - 1) return;
    picker.gradientData.stops.splice(i + 1, 0, ...picker.gradientData.stops.splice(i, 1));
}
function removeStop(i: number) {
    picker.gradientData.stops.splice(i, 1);
}
</script>

<template>
    <input type="button" class="pickerBadge" ref="pickerBadge" @click="togglePicker" :disabled="props.disabled">
    <DraggableWindow v-model="picker.open" ref="pickerWindow" title="Color Picker" close-on-click-out :min-width="240" :min-height="240" @close="fudgeBadgeClickClose">
        <div class="pickerContainer">
            <div class="pickerNav">
                <input type="button" :class="{ pickerNavTab: true, pickerNavTabSelected: picker.type == 'solid' }" value="Solid" title="Solid color" @click="picker.type = 'solid'">
                <input type="button" :class="{ pickerNavTab: true, pickerNavTabSelected: picker.type == 'gradient' }" value="Gradient" title="Gradient color" @click="picker.type = 'gradient'">
                <input type="button" class="pickerNavTab pickerNavCopy" title="Copy color" @click="picker.copyColor()">
                <input type="button" class="pickerNavTab pickerNavPaste" title="Paste color" @click="picker.pasteColor()">
            </div>
            <div class="pickerBody pickerSolid" v-if="picker.type == 'solid'">
                <ColorInput class="pickerSolidColorSwatch" v-model="picker.solidData.color" title="Select color"></ColorInput>
                <input type="button" class="pickerEyedropperButton" title="Pick color using eyedropper tool" @click="runEyedropperSolid()" v-if="eyedropper.isSupported.value">
                <label title="Opacity of solid color">
                    Opacity:
                    <StrictNumberInput v-model="picker.solidData.alpha" :min="0" :max="1" :step="0.01"></StrictNumberInput>
                </label>
            </div>
            <div class="pickerBody pickerGradient" v-else-if="picker.type == 'gradient'">
                <select class="pickerGradientPattern" v-model="picker.gradientData.pattern" title="Pattern of gradient">
                    <option value="linear">Linear Gradient</option>
                    <option value="radial">Radial Gradient</option>
                    <option value="conic">Conical Gradient</option>
                </select>
                <!-- cheesing strict number input to get input validation without actually being strict -->
                <label class="pickerGradientLabel" title="X of center (proportion of width)">
                    X
                    <StrictNumberInput class="pickerGradientNumberInput" v-model="picker.gradientData.x" :min="0" :max="1" :strict-min="-Infinity" :strict-max="Infinity" :step="0.01" :strict-step="0" :disabled="picker.gradientData.pattern == 'linear'"></StrictNumberInput>
                </label>
                <label class="pickerGradientLabel" title="Y of center (proportion of height)">
                    Y
                    <StrictNumberInput class="pickerGradientNumberInput" v-model="picker.gradientData.y" :min="0" :max="1" :strict-min="-Infinity" :strict-max="Infinity" :step="0.01" :strict-step="0" :disabled="picker.gradientData.pattern == 'linear'"></StrictNumberInput>
                </label>
                <label class="pickerGradientLabel" title="Radius (proportion of max(width, height))">
                    R
                    <StrictNumberInput class="pickerGradientNumberInput" v-model="picker.gradientData.radius" :min="0" :max="1" :strict-min="-Infinity" :strict-max="Infinity" :step="0.01" :strict-step="0" :disabled="picker.gradientData.pattern != 'radial'"></StrictNumberInput>
                </label>
                <label class="pickerGradientLabel" title="Angle (degrees)">
                    θ
                    <StrictNumberInput class="pickerGradientNumberInput" v-model="picker.gradientData.angle" :min="0" :max="1" :strict-min="-Infinity" :strict-max="Infinity" :step="1" :strict-step="0" :disabled="picker.gradientData.pattern == 'radial'"></StrictNumberInput>
                </label>
                <div class="pickerGradientStopsContainer">
                    <div v-for="(stop, i) of picker.gradientData.stops" :key="i" class="pickerGradientStop">
                        <StrictNumberInput class="pickerGradientStopNumber" v-model="stop.t" :min="0" :max="1" :step="0.1" :strict-step="0.01" title="Position of stop (0-1)"></StrictNumberInput>
                        <ColorInput class="pickerGradientStopColor" v-model="stop.c" title="Color of stop"></ColorInput>
                        <input type="button" class="pickerGradientStopEyedropper" title="Pick stop color using eyedropper tool" @click="runEyedropperStop(i)" v-if="eyedropper.isSupported.value">
                        <StrictNumberInput class="pickerGradientStopNumber" v-model="stop.a" :min="0" :max="1" :step="0.1" :strict-step="0.01" title="Opacity of stop"></StrictNumberInput>
                        <input type="button" class="pickerGradientStopUp" title="Move stop up" @click="moveStopUp(i)" :disabled="i == 0">
                        <input type="button" class="pickerGradientStopDown" title="Move stop down" @click="moveStopDown(i)" :disabled="i == picker.gradientData.stops.length - 1">
                        <input type="button" class="pickerGradientStopDelete" title="Remove stop" @click="removeStop(i)" :disabled="picker.gradientData.stops.length == 1">
                    </div>
                </div>
                <input type="button" class="pickerGradientAddStop" value="+" title="Add color stop" @click="addStop">
            </div>
        </div>
    </DraggableWindow>
</template>

<style scoped>
.pickerBadge {
    container: size;
    display: inline-block;
    box-sizing: border-box;
    vertical-align: top;
    position: relative;
    width: v-bind("$props.badgeWidth ?? '44px'");
    height: v-bind("$props.badgeHeight ?? '20px'");
    border: 2px solid white;
    background-color: black;
    background: v-bind("picker.cssStyle");
    transform: scaleY(-1);
    --radial-gradient-size: v-bind("`min(${$props.badgeWidth ?? '44px'}, ${$props.badgeHeight ?? '20px'})`");
}

.pickerBadge:disabled {
    border-color: #555;
}

.pickerContainer {
    display: grid;
    grid-template-rows: 1fr min-content;
    grid-template-columns: 1fr;
    width: 100%;
    height: 100%;
}

.pickerNav {
    grid-row: 2;
    display: flex;
    flex-direction: row;
    height: 20px;
    font-size: 14px;
    border-top: 4px solid #333;
}

.pickerNavTab {
    background-color: black;
    border-radius: 0px;
    flex-grow: 1;
    flex-basis: 0px;
    outline-offset: -1px;
}

.pickerNavTab:hover {
    background-color: #222;
}

.pickerNavTabSelected {
    background-color: #333 !important;
}

.pickerNavCopy,
.pickerNavPaste {
    width: 20px;
    flex-grow: unset;
    flex-basis: 20px;
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
}

.pickerNavCopy {
    background-image: url(@/img/copy.svg);
}

.pickerNavPaste {
    background-image: url(@/img/paste.svg);
}

.pickerBody {
    grid-row: 1;
}

.pickerSolid {
    display: grid;
    grid-template-rows: 48px min-content;
    grid-template-columns: 1fr min-content;
    padding: 8px 8px;
    gap: 4px;
}

.pickerSolidColorSwatch {
    grid-row: 1;
    grid-column: 1;
    width: 100%;
    height: 100%;
}

.pickerEyedropperButton {
    grid-row: 1;
    grid-column: 2;
    width: 28px;
    height: 28px;
    align-self: center;
    background-image: url(@/img/eyedropper.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.pickerSolid>label {
    grid-row: 2;
    grid-column: 1 / 3;
    text-align: center;
}

.pickerGradient {
    display: grid;
    grid-template-rows: min-content min-content min-content 1fr min-content;
    grid-template-columns: 1fr 1fr;
    padding: 8px 8px;
    gap: 4px;
}

.pickerGradientPattern {
    grid-row: 1;
    grid-column: 1 / 3;
    height: 20px;
}

.pickerGradientLabel {
    display: flex;
    padding: 0px 4px;
    column-gap: 6px;
}

.pickerGradientNumberInput {
    box-sizing: border-box;
    min-width: 0px;
    width: 100%;
}

.pickerGradientStopsContainer {
    contain: size;
    grid-row: 4;
    grid-column: 1 / 3;
    display: flex;
    flex-direction: column;
    border: 2px solid white;
    overflow-y: auto;
}

.pickerGradientStop {
    display: flex;
    flex-direction: row;
    height: 16px;
    border-bottom: 2px solid white;
    background-color: white;
    gap: 2px;
}

.pickerGradientStopNumber {
    width: 44px;
    border-radius: 0px;
    outline-offset: -1px;
}

.pickerGradientStopColor {
    height: 16px;
    flex-grow: 1;
}

.pickerGradientStopColor::-webkit-color-swatch {
    border: none;
}

.pickerGradientStopEyedropper,
.pickerGradientStopUp,
.pickerGradientStopDown,
.pickerGradientStopDelete {
    width: 16px;
    border-radius: 0px;
    background-color: #666;
    background-position: center;
    background-size: 100% 100%;
    background-repeat: no-repeat;
}

.pickerGradientStopEyedropper:hover,
.pickerGradientStopUp:hover,
.pickerGradientStopDown:hover {
    background-color: #777;
}

.pickerGradientStopDelete:hover {
    background-color: red;
}

.pickerGradientStopEyedropper:disabled,
.pickerGradientStopUp:disabled,
.pickerGradientStopDown:disabled,
.pickerGradientStopDelete:disabled {
    background-color: #333;
}

.pickerGradientStopEyedropper {
    background-image: url(@/img/eyedropper.svg);
}

.pickerGradientStopUp {
    background-image: url(@/img/arrow-up.svg);
    background-size: 80% 80%;
}

.pickerGradientStopDown {
    background-image: url(@/img/arrow-down.svg);
    background-size: 80% 80%;
}

.pickerGradientStopDelete {
    background-image: url(@/img/delete.svg);
}

.pickerGradientAddStop {
    grid-row: 5;
    grid-column: 1 / 3;
    font-size: 20px;
    padding: 0px 0px;
    line-height: 0.8em;
}
</style>