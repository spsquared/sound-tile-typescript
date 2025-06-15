<script setup lang="ts">
import { useTemplateRef, watch } from 'vue';
import DraggableWindow from '../DraggableWindow.vue';
import { EnhancedColorPicker } from './enhancedColorPicker';
import { useEyeDropper } from '@vueuse/core';
import StrictNumberInput from './StrictNumberInput.vue';
import ColorInput from './ColorInput.vue';

const props = defineProps<{
    picker: EnhancedColorPicker
    disabled?: boolean
}>();

const pickerWindow = useTemplateRef('pickerWindow');
const pickerBadge = useTemplateRef('pickerBadge');

// clicking on badge to close triggers close on click off but immediately reopens due to badge click
let recentlyClosed = false;
function fudgeBadgeClickClose() {
    recentlyClosed = true;
    setTimeout(() => recentlyClosed = false, 10);
}
function togglePicker() {
    if (recentlyClosed) return;
    props.picker.open = !props.picker.open;
    if (pickerWindow.value !== null && pickerBadge.value !== null && props.picker.open) {
        // useElementBounding doesn't work for some reason
        const rect = pickerBadge.value.getBoundingClientRect();
        pickerWindow.value.posX = rect.left;
        pickerWindow.value.posY = rect.top - 268;
        pickerWindow.value.focus();
    }
}
watch(() => props.disabled, () => {
    if (props.disabled) props.picker.open = false;
});

function addStop() {
    props.picker.gradientData.stops.push({ t: 1, c: '#FFFFFF', a: 1 });
}

const eyedropper = useEyeDropper();
async function runEyedropperSolid() {
    const res = await eyedropper.open();
    if (res !== undefined) props.picker.solidData.color = res.sRGBHex;
}
async function runEyedropperStop(i: number) {
    const res = await eyedropper.open();
    if (res !== undefined) {
        const stop = props.picker.gradientData.stops[i];
        if (stop !== undefined) stop.c = res.sRGBHex;
    }
}
function moveStopUp(i: number) {
    if (i == 0) return;
    props.picker.gradientData.stops.splice(i - 1, 0, ...props.picker.gradientData.stops.splice(i, 1));
}
function moveStopDown(i: number) {
    if (i == props.picker.gradientData.stops.length - 1) return;
    props.picker.gradientData.stops.splice(i + 1, 0, ...props.picker.gradientData.stops.splice(i, 1));
}
function removeStop(i: number) {
    props.picker.gradientData.stops.splice(i, 1);
}
</script>

<template>
    <div :class="{ pickerBadge: true, pickerBadgeDisabled: props.disabled }" ref="pickerBadge" @click="togglePicker"></div>
    <DraggableWindow v-model="props.picker.open" ref="pickerWindow" title="Color Picker" close-on-click-out :min-width="240" :min-height="240" @close="fudgeBadgeClickClose">
        <div class="pickerContainer">
            <div class="pickerNav">
                <input type="button" :class="{ pickerNavTab: true, pickerNavTabSelected: props.picker.type == 'solid' }" value="Solid" title="Solid color" @click="props.picker.type = 'solid'">
                <input type="button" :class="{ pickerNavTab: true, pickerNavTabSelected: props.picker.type == 'gradient' }" value="Gradient" title="Gradient color" @click="props.picker.type = 'gradient'">
                <input type="button" class="pickerNavTab pickerNavCopy" title="Copy color" @click="props.picker.copyColor()">
                <input type="button" class="pickerNavTab pickerNavPaste" title="Paste color" @click="props.picker.pasteColor()">
            </div>
            <div class="pickerBody pickerSolid" v-if="props.picker.type == 'solid'">
                <ColorInput class="pickerSolidColorSwatch" v-model="props.picker.solidData.color" title="Select color"></ColorInput>
                <input type="button" class="pickerEyedropperButton" title="Pick color using eyedropper tool" @click="runEyedropperSolid()" v-if="eyedropper.isSupported">
                <label title="Opacity of solid color">
                    Opacity:
                    <StrictNumberInput v-model="props.picker.solidData.alpha" :min="0" :max="1" :step="0.01"></StrictNumberInput>
                </label>
            </div>
            <div class="pickerBody pickerGradient" v-else-if="props.picker.type == 'gradient'">
                <select class="pickerGradientPattern" v-model="props.picker.gradientData.pattern" title="Pattern of gradient">
                    <option value="linear">Linear Gradient</option>
                    <option value="radial">Radial Gradient</option>
                    <option value="conic">Conical Gradient</option>
                </select>
                <!-- intentionally NOT strict -->
                <label class="pickerGradientLabel" title="X of center (proportion of width)">
                    X
                    <input type="number" class="pickerGradientNumberInput" v-model="props.picker.gradientData.x" step="0.01" :disabled="props.picker.gradientData.pattern == 'linear'">
                </label>
                <label class="pickerGradientLabel" title="Y of center (proportion of height)">
                    Y
                    <input type="number" class="pickerGradientNumberInput" v-model="props.picker.gradientData.y" step="0.01" :disabled="props.picker.gradientData.pattern == 'linear'">
                </label>
                <label class="pickerGradientLabel" title="Radius (proportion of max(width, height))">
                    R
                    <input type="number" class="pickerGradientNumberInput" v-model="props.picker.gradientData.radius" step="0.01" :disabled="props.picker.gradientData.pattern != 'radial'">
                </label>
                <label class="pickerGradientLabel" title="Angle (degrees)">
                    θ
                    <input type="number" class="pickerGradientNumberInput" v-model="props.picker.gradientData.angle" step="1" :disabled="props.picker.gradientData.pattern == 'radial'">
                </label>
                <div class="pickerGradientStopsContainer">
                    <div v-for="(stop, i) of props.picker.gradientData.stops" :key="i" class="pickerGradientStop">
                        <StrictNumberInput class="pickerGradientStopNumber" v-model="stop.t" :min="0" :max="1" :step="0.01" title="Position of stop (0-1)"></StrictNumberInput>
                        <ColorInput class="pickerGradientStopColor" v-model="stop.c" title="Color of stop"></ColorInput>
                        <input type="button" class="pickerGradientStopEyedropper" title="Pick color of stop using eyedropper tool" @click="runEyedropperStop(i)" v-if="eyedropper.isSupported">
                        <StrictNumberInput class="pickerGradientStopNumber" v-model="stop.a" :min="0" :max="1" :step="0.01" title="Opacity of stop"></StrictNumberInput>
                        <input type="button" class="pickerGradientStopUp" title="Move stop up" @click="moveStopUp(i)" :disabled="i == 0">
                        <input type="button" class="pickerGradientStopDown" title="Move stop down" @click="moveStopDown(i)" :disabled="i == props.picker.gradientData.stops.length - 1">
                        <input type="button" class="pickerGradientStopDelete" title="Remove stop" @click="removeStop(i)" :disabled="props.picker.gradientData.stops.length == 1">
                    </div>
                </div>
                <input type="button" class="pickerGradientAddStop" value="+" title="Add color stop" @click="addStop">
            </div>
        </div>
    </DraggableWindow>
</template>

<style scoped>
.pickerBadge {
    display: inline-block;
    box-sizing: border-box;
    vertical-align: top;
    position: relative;
    width: 44px;
    height: 20px;
    border: 2px solid white;
    background-color: black;
    background: v-bind("$props.picker.cssStyle");
    cursor: pointer;
    --radial-gradient-size: 22px;
}

.pickerBadgeDisabled {
    cursor: not-allowed;
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
    height: 20px;
    font-size: 14px;
    border-top: 4px solid #333;
    flex-direction: row;
}

.pickerNavTab {
    background-color: black;
    border-radius: 0px;
    flex-grow: 1;
    flex-basis: 0px;
    transition: 50ms linear background-color;
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
    border: 2px solid white;
    flex-direction: column;
    overflow-y: auto;
}

.pickerGradientStop {
    display: flex;
    height: 16px;
    border-bottom: 2px solid white;
    background-color: white;
    gap: 2px;
    flex-direction: row;
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
.pickerGradientStopDown:hover,
.pickerGradientStopDelete:hover {
    background-color: #777;
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