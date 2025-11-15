<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
    /**Minimum value accessible by input scroller, default also the hard minimum */
    min?: number
    /**Maximum vlaue accessible by input scroller, default also the hard maximum */
    max?: number
    /**The step of the input scroller, default also the quantization value */
    step?: number
    /**Override the hard minimum */
    strictMin?: number
    /**Override the hard maximum */
    strictMax?: number
    /**Override the quantization value */
    strictStep?: number
}>();
const emit = defineEmits<{
    (e: 'input', value: number): any
    (e: 'rawinput', value: number): any
    (e: 'keydown', ev: KeyboardEvent): any
}>();

const model = defineModel({ default: 0 }); // model value - outside changes always update internal and displayed values
const value = ref(model.value); // the internal value - always updates model value, only updates displayed on blur
const displayedValue = ref(model.value); // displayed - only updates internal value

watch(model, (v) => value.value != v && (value.value = v, displayedValue.value = v));
watch(value, (v) => model.value != v && (model.value = v));

function input() {
    const step = props.strictStep ?? props.step;
    const clamped = Math.max(props.strictMin ?? props.min ?? -Infinity, Math.min(displayedValue.value, props.strictMax ?? props.max ?? Infinity));
    if (step != undefined && step > 0) {
        value.value = Number((Math.round(clamped / step) * step).toFixed((step.toString().split('.')[1] ?? '').length));
    } else {
        value.value = clamped;
    }
    emit('input', value.value);
    emit('rawinput', displayedValue.value);
}
function blur() {
    displayedValue.value = value.value;
    emit('rawinput', displayedValue.value);
}
function keydown(e: KeyboardEvent) {
    emit('keydown', e);
}

defineExpose({
    value: value
});
</script>

<template>
    <input type="number" v-model="displayedValue" @input="input" @keydown="keydown" @blur="blur" :min="props.min" :max="props.max" :step="props.step">
</template>

<style scoped></style>