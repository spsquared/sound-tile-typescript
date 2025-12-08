<script setup lang="ts">
import { ref, watch } from 'vue';
import Modulation from '@/visualizer/modulation';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import polynomial from '@/components/inputs/simplePolynomial';
import arrowUpIcon from '@/img/arrow-up-dark.svg';
import arrowDownIcon from '@/img/arrow-down-dark.svg';

const props = defineProps<{
    transform: Modulation.Transform<any>
}>();

const infoOpen = ref(false);

// yes all of this is just to make typing in the text box not suck
const polyParseError = ref(false);
const polyString = ref('');
const polyFocused = ref(false);
watch(polyString, () => {
    if (props.transform instanceof Modulation.PolynomialTransform) {
        if (polyFocused.value) try {
            props.transform.data = polynomial.parse(polyString.value);
            polyParseError.value = false;
        } catch {
            polyParseError.value = true;
        }
    }
});
watch([() => props.transform.data, polyFocused], () => {
    if (props.transform instanceof Modulation.PolynomialTransform) {
        if (!polyFocused.value) {
            polyString.value = polynomial.format(props.transform.data);
            polyParseError.value = false;
        }
    }
}, { immediate: true });
</script>

<template>
    <!-- this just handles inputs for the transform, reordering/removal is in the connection component -->
    <!-- parenthesis fixes vue vscode extension borking from instanceof operator (and comments help eye death) -->
    <div class="transformContainer" v-if="(props.transform instanceof Modulation.ConstantOffsetTransform)">
        <!-- CONSTANT OFFSET -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Constant Offset</div>
        <div class="transformOptions"></div>
        <div class="transformParams">
            <span style="color: var(--logo-blue);">f(x)</span>
            =
            <span style="color: var(--logo-green);">x</span>
            +
            <input type="number" v-model="props.transform.data" step="0.1">
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>Applies a constant offset added to the modulation value.</p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = <span style="color: var(--logo-green);">x</span> + a</pre>
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.LinearTransform)">
        <!-- LINEAR -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Linear</div>
        <div class="transformOptions"></div>
        <div class="transformParams">
            <span style="color: var(--logo-blue);">f(x)</span>
            =
            <input type="number" v-model="props.transform.data[0]" step="0.1">
            <span style="color: var(--logo-green);">x</span>
            +
            <input type="number" v-model="props.transform.data[1]" step="0.1">
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>Essentially a linear function of the modulation value.</p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = a<span style="color: var(--logo-green);">x</span> + b</pre>
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.PolynomialTransform)">
        <!-- POLYNOMIAL -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Polynomial</div>
        <div class="transformOptions">
            <!-- <Toggle v-model="polyInputMode"></Toggle>
            {{ polyInputMode ? '&nbsp;Text&nbsp;' : 'Simple' }} -->
            <!-- will re-add once friendly input mode is added -->
        </div>
        <div class="transformParams">
            <span style="color: var(--logo-blue);">f(x)</span>
            =
            <input type="text" :class="{ transformPolyInput: true, transformPolyError: polyParseError }" v-model="polyString" @focus="polyFocused = true" @blur="polyFocused = false">
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>A more complex n-term polynomial function of the modulation value.</p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = a + b<span style="color: var(--logo-green);">x</span> + c<span style="color: var(--logo-green);">x</span>^2 + ...</pre>
            <p><i>Negative exponents (division) and x-shifts are not supported.</i></p>
            <!-- ADD REFERENCE TO MATH TRANSFORM -->
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.ExponentialTransform)">
        <!-- EXPONENTIAL -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Exponential</div>
        <div class="transformOptions"></div>
        <div class="transformParams">
            <span style="color: var(--logo-blue);">f(x)</span>
            =
            <input type="number" v-model="props.transform.data[0]" step="0.1">
            *
            (<input type="number" v-model="props.transform.data[1]" step="0.1">
            ^
            <span style="color: var(--logo-green);">x</span>)
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>An exponential function of a constant raised to the power of the modulation value.</p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = a(b^<span style="color: var(--logo-green);">x</span>)</pre>
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.ThresholdTransform)">
        <!-- THRESHOLD -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Threshold</div>
        <div class="transformOptions">
            <Toggle v-model="props.transform.data[1]" :icon="props.transform.data[1] ? arrowUpIcon : arrowDownIcon" icon-size="60% 60%"></Toggle>
            {{ props.transform.data[1] ? 'Above' : 'Below' }}
        </div>
        <div class="transformParams">
            <div class="transformThresholdLayout">
                <span style="color: var(--logo-blue);">f(x)</span>
                =
                <span style="font-size: 2em;">{</span>
                <div>
                    <div>
                        <span style="color: var(--logo-green);">x</span>
                        <span>,</span>
                        <span style="color: var(--logo-green);">x</span>
                        <span>{{ props.transform.data[1] ? '>=' : '<=' }}</span>
                                <input type="number" v-model="props.transform.data[0]" step="0.1">
                    </div>
                    <div>
                        <input type="number" v-model="props.transform.data[2]" step="0.1">
                        <span>,</span>
                        <span style="color: var(--logo-green);">x</span>
                        <span>{{ props.transform.data[1] ? '<' : '>' }}</span>
                                <input type="number" v-model="props.transform.data[0]" step="0.1">
                    </div>
                </div>
            </div>
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>
                Acts as a "gate", allowing the modulation value through if above/below (or equal to) a certain value,
                and otherwise a set constant.
            </p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = { <span style="color: var(--logo-green);">x</span>, <span style="color: var(--logo-green);">x</span> >= a<br>       { c, <span style="color: var(--logo-green);">x</span> <  a</pre>
            <p>
                (or <code><=</code> and <code>></code>)
            </p>
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.ClampTransform)">
        <!-- CLAMP -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Clamp</div>
        <div class="transformOptions"></div>
        <div class="transformParams">
            Range: [<StrictNumberInput v-model="props.transform.data[0]" :max="props.transform.data[1]" :step="0.1" :strict-step="0"></StrictNumberInput>, <StrictNumberInput v-model="props.transform.data[1]" :min="props.transform.data[0]" :step="0.1" :strict-step="0"></StrictNumberInput>]
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>
                Restricts the modulator value's range (inclusive).
            </p>
            <pre><span style="color: var(--logo-blue);">f(x)</span> = clamp(<span style="color: var(--logo-green);">x</span>, a, b)</pre>
            <p style="font-size: 0.5em;">I mean what did you expect... there's no notation outside of computer science for this.</p>
        </div>
    </div>
    <div class="transformContainer" v-else-if="(props.transform instanceof Modulation.PeriodicTransform)">
        <!-- PERIODIC / LFO -->
        <div class="transformLabel" @click="infoOpen = !infoOpen" title="Click to expand transform details">Periodic (LFO)</div>
        <div class="transformOptions">
            <div style="display: flex; column-gap: 4px; height: 20px;">
                <img src="@/img/wave-sine.svg" v-if="props.transform.data[0] == 'sine'"></img>
                <img src="@/img/wave-ramp.svg" v-if="props.transform.data[0] == 'ramp'"></img>
                <img src="@/img/wave-pulse.svg" v-if="props.transform.data[0] == 'pulse'"></img>
                <select v-model="props.transform.data[0]">
                    <option value="sine">Sine</option>
                    <option value="ramp">Ramp</option>
                    <option value="pulse">Pulse</option>
                </select>
            </div>
        </div>
        <div class="transformParams">
            <div class="transformPeriodicLayout">
                <div>
                    <label title="Frequency of periodic function">
                        Freq=<StrictNumberInput v-model="props.transform.data[2]" :min="0.01" :max="20000" :step="0.01" :strict-step="0"></StrictNumberInput>
                    </label>
                    <label button title="Toggle between Hertz and Beats per Minute">
                        <Transition name="periodic-freq-unit">
                            <div v-if="props.transform.data[4]">BPM</div>
                            <div v-else>Hz</div>
                        </Transition>
                        <input type="checkbox" v-model="props.transform.data[4]" style="display: none;"></input>
                    </label>
                </div>
                <div>
                    <label title="Phase shift from 0-1 rather than an angle">
                        Phase=<StrictNumberInput v-model="props.transform.data[3]" :min="0" :max="1" :step="0.05" :strict-step="0"></StrictNumberInput>
                    </label>
                    <template v-if="props.transform.data[0] != 'sine'">
                        <label :title="`${props.transform.data[0] == 'ramp' ? 'Morph shape' : 'Pulse width'} of ${props.transform.data[0]}`">
                            {{ props.transform.data[0] == 'ramp' ? 'Shape' : 'Pulse' }}=<StrictNumberInput v-model="props.transform.data[1]" :min="0" :max="1" :step="0.05" :strict-step="0"></StrictNumberInput>
                        </label>
                    </template>
                </div>
                <svg width="72" height="48" viewBox="0 0 64 64" alt="Wave preview" title="Oscillator waveform preview">
                    <g fill="none" stroke="#ffffff" stroke-width="4" :transform="`translate(${props.transform.data[3] * 64} 0)`">
                        <path :d="`M -128 32 ${new Array(4).fill(0).map((_, i) => {
                            const x = (i - 2) * 64;
                            return `C ${x + 30.08} -23.36 ${x + 33.92} 87.36 ${x + 64} 32`;
                        }).join(' ')}`" v-if="props.transform.data[0] == 'sine'" />
                        <polyline :points="new Array(9).fill(0).map((_, i) => [
                            (i - 4) * 32 + (i % 2 == 1 ? (props.transform as Modulation.PeriodicTransform).data[1] * 64 - 32 : 0),
                            ((i + 1) % 2) * 32 + 16
                        ]).flat().join(' ')" v-else-if="props.transform.data[0] == 'ramp'" />
                        <polyline :points="new Array(4).fill(0).map((_, i) => {
                            const x = (i - 2) * 64;
                            const shape = (props.transform as Modulation.PeriodicTransform).data[1] * 64
                            return [x, 16, x + shape, 16, x + shape, 48, x + 64, 48];
                        }).flat().join(' ')" v-else-if="props.transform.data[0] == 'pulse'" />
                    </g>
                    <path d="M 0 12 L 0 52 M 64 12 L 64 52" fill="none" stroke="var(--logo-blue)" stroke-width="2"></path>
                </svg>
            </div>
        </div>
        <div class="transformInfo" v-show="infoOpen">
            <p>
                Converts the modulator's value using a periodic (oscillating) function.
                Can be used as an LFO modulator when combined with the Global Modulator's <code>playbackTime</code> source.
            </p>
        </div>
    </div>
    <!-- math transform (update info for polynomial) -->
    <!-- problem: its basically just polynomial transform but better, polynomial will need to get simpler UI -->
    <div class="transformContainer" v-else>
        <p>Could not determine transform type</p>
        <div>{{ props.transform.class.type }} {{ props.transform.data }}</div>
    </div>
</template>

<style scoped>
.transformContainer {
    grid-area: item;
    display: grid;
    /* grid-template-rows: 2fr 3fr; */
    grid-template-rows: 1fr 2fr;
    grid-template-columns: 1fr 1fr;
    /* "options" and "params" are very similar lol */
    grid-template-areas: "label options" "params params";
}

.transformLabel {
    grid-area: label;
    align-content: center;
    text-align: center;
    cursor: help;
    user-select: none;
}

.transformLabel:hover {
    text-decoration: underline;
}

.transformOptions {
    grid-area: options;
    justify-items: center;
    align-content: center;
    text-align: center;
}

.transformParams {
    grid-area: params;
    padding: 0px 4px;
    justify-items: center;
    align-content: center;
    text-align: center;
    font-size: 14px;
    --scrollbar-size: 8px;
    --scrollbar-padding: 0px;
}

.transformInfo {
    grid-area: params;
    background-color: black;
    font-size: 14px;
    overflow-y: scroll;
    --scrollbar-size: 8px;
    --scrollbar-padding: 0px;
    z-index: 1;
}

@supports (not(selector(::-webkit-scrollbar))) {
    .transformParams {
        scrollbar-width: thin;
    }
}

input,
label[button] {
    min-width: 3em;
    width: 3em;
    border-radius: 0px;
    background: #FFF2;
}

input:hover,
input:focus-visible,
label[button]:hover,
label[button]:focus-visible {
    background-color: #FFF3;
}

/* BELOW - specific to individual transform types */

.transformPolyInput {
    width: 12em;
}

.transformPolyError {
    outline-color: red;
}

.transformThresholdLayout {
    display: flex;
    flex-direction: row;
    align-items: center;
    column-gap: 0.5em;
}

.transformThresholdLayout>div {
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: repeat(5, auto);
}

.transformThresholdLayout>div>div {
    grid-column: span 5;
    display: grid;
    grid-template-rows: subgrid;
    grid-template-columns: subgrid;
    justify-items: start;
    column-gap: 0.5em;
}

.transformPeriodicLayout {
    contain: size;
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: 1fr 72px;
    width: 100%;
    height: 100%;
    justify-items: center;
}

.transformPeriodicLayout>div {
    display: flex;
    flex-direction: row;
    min-width: 0px;
    column-gap: 4px;
    align-items: center;
    text-wrap: nowrap;
}

.transformPeriodicLayout label[button] {
    position: relative;
    height: 20px;
    user-select: none;
    overflow: hidden;
}

.transformPeriodicLayout label[button]>div {
    position: absolute;
    width: 100%;
    text-align: center;
}

.transformPeriodicLayout input {
    width: 3.5em;
}

.transformPeriodicLayout>svg {
    grid-row: 1 / 3;
    grid-column: 2;
}

.periodic-freq-unit-enter-active,
.periodic-freq-unit-leave-active {
    transition: 100ms ease transform, 100ms linear opacity;
}

.periodic-freq-unit-enter-from {
    transform: translateY(-100%);
    opacity: 0;
}

.periodic-freq-unit-enter-to,
.periodic-freq-unit-leave-from {
    transform: translateY(0px);
    opacity: 1;
}

.periodic-freq-unit-leave-to {
    transform: translateY(100%);
    opacity: 0;
}
</style>