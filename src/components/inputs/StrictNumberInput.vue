<script setup lang="ts">
const props = defineProps<{
    min?: number
    max?: number
    step?: number
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
    const clamped = Math.max(props.min ?? -Infinity, Math.min(number.value, props.max ?? Infinity));
    if (props.step != undefined && props.step > 0) {
        number.value = Number((Math.round(clamped / props.step) * props.step).toFixed((props.step.toString().split('.')[1] ?? '').length));
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