<script setup lang="ts">
import { ref, watch } from 'vue';
import Modulation from '@/visualizer/modulation';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import polynomial from '@/components/scripts/simplePolynomial';

const props = defineProps<{
    transform: Modulation.Transform<any>
}>();

const infoOpen = ref(false);

// yes all of this is just to make typing in the text box not suck
// const polyInputMode = ref(false);
const polyParseError = ref(false);
const polyString = ref('');
const polyFocused = ref(false);
// watch(polyInputMode, () => polyFocused.value = polyInputMode.value && polyFocused.value);
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
watch([() => props.transform.data, polyFocused/*, polyInputMode*/], () => {
    if (props.transform instanceof Modulation.PolynomialTransform) {
        if (!polyFocused.value) {
            polyString.value = polynomial.format(props.transform.data);
            polyParseError.value = false;
        }
    }
}, { immediate: true });
</script>
<script lang="ts">
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
            <input type="number" v-model="props.transform.data" step="0.1"></input>
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
            <input type="number" v-model="props.transform.data[0]" step="0.1"></input>
            <span style="color: var(--logo-green);">x</span>
            +
            <input type="number" v-model="props.transform.data[1]" step="0.1"></input>
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
            <input type="text" :class="{ transformPolyInput: true, transformPolyError: polyParseError }" v-model="polyString" @focus="polyFocused = true" @blur="polyFocused = false"></input>
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
            <input type="number" v-model="props.transform.data[0]" step="0.1"></input>
            *
            (<input type="number" v-model="props.transform.data[1]" step="0.1"></input>
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
            <Toggle v-model="props.transform.data[1]"></Toggle>
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
                                <input type="number" v-model="props.transform.data[0]" step="0.1"></input>
                    </div>
                    <div>
                        <input type="number" v-model="props.transform.data[2]" step="0.1"></input>
                        <span>,</span>
                        <span style="color: var(--logo-green);">x</span>
                        <span>{{ props.transform.data[1] ? '<' : '>' }}</span>
                                <input type="number" v-model="props.transform.data[0]" step="0.1"></input>
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
    <!-- math transform (update info for polynomial) -->
    <!-- problem: its basically just polynomial transform but better, polynomial will need to get simpler UI -->
    <div class="transformContainer" v-else>
        <p>Could not determine transform type</p>
        <div>{{ props.transform.type }} {{ props.transform.data }}</div>
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
}

@supports (not(selector(::-webkit-scrollbar))) {
    .transformParams {
        scrollbar-width: thin;
    }
}

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

input {
    min-width: 3em;
    width: 3em;
    border-radius: 0px;
    background: #FFF2;
}

input:hover,
input:focus-visible {
    background-color: #FFF3;
}
</style>