<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
    min?: number
    max?: number
    step?: number
    strictMin?: number
    strictMax?: number
    strictStep?: number
}>();
const emit = defineEmits<{
    (e: 'input', value: number): any
    (e: 'keydown', ev: KeyboardEvent): any
}>();

const number = defineModel({ default: 0 });
const displayedValue = ref(number.value);

function input() {
    const step = props.strictStep ?? props.step;
    const clamped = Math.max(props.strictMin ?? props.min ?? -Infinity, Math.min(displayedValue.value, props.strictMax ?? props.max ?? Infinity));
    if (step != undefined && step > 0) {
        number.value = Number((Math.round(clamped / step) * step).toFixed((step.toString().split('.')[1] ?? '').length));
    } else {
        number.value = clamped;
    }
    emit('input', number.value);
}
function blur() {
    displayedValue.value = number.value;
}
function keydown(e: KeyboardEvent) {
    emit('keydown', e);
}
defineExpose({
    value: number
});
</script>

<template>
    <input type="number" v-model="displayedValue" @input="input" @keydown="keydown" @blur="blur" :min="props.min" :max="props.max" :step="props.step">
</template>

<style scoped></style>