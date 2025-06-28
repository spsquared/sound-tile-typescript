<script setup lang="ts">
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
function input() {
    emit('input', number.value);
}
function keydown(e: KeyboardEvent) {
    emit('keydown', e);
}
defineExpose({
    value: number
});
function blur() {
    const step = props.strictStep ?? props.step;
    const clamped = Math.max(props.strictMin ?? props.min ?? -Infinity, Math.min(number.value, props.strictMax ?? props.max ?? Infinity));
    if (step != undefined && step > 0) {
        number.value = Number((Math.round(clamped / step) * step).toFixed((step.toString().split('.')[1] ?? '').length));
    } else {
        number.value = clamped;
    }
    input();
}
</script>

<template>
    <input type="number" v-model=number @input="input" @keydown="keydown" @blur="blur" :min="props.min" :max="props.max" :step="props.step">
</template>

<style scoped></style>