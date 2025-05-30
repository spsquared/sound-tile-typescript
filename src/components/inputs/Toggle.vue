<script setup lang="ts">
const props = defineProps<{
    title?: string
    color1?: string
    color2?: string
    borderWidth?: string
    disabled?: boolean
}>();
const checked = defineModel({ default: false });
const emit = defineEmits<{
    (e: 'input', checked: boolean): any
}>();
function input() {
    emit('input', checked.value);
}
defineExpose({
    checked
});
</script>

<template>
    <label :class="{ toggle: true, toggleDisabled: props.disabled }">
        <input class="toggleInput" type="checkbox" @change="input" v-model="checked" :title="props.title" :disabled="props.disabled">
        <div class="toggleSlider"></div>
    </label>
</template>

<style scoped>
.toggle {
    display: inline-block;
    position: relative;
    top: 1px;
    width: 42px;
    height: 22px;
    --border-width: v-bind("$props.borderWidth ?? '1px'");
    cursor: pointer;
}

.toggleInput {
    opacity: 0;
    width: 0px;
    height: 0px;
}

.toggleSlider {
    position: absolute;
    top: calc(7px - var(--border-width));
    left: calc(6px - var(--border-width));
    width: 30px;
    height: 8px;
    background-color: v-bind("$props.color1 ?? '#F00'");
    border: var(--border-width) solid white;
    transition: 0.1s linear background-color;
    pointer-events: none;
}

.toggleSlider::before {
    content: '';
    box-sizing: border-box;
    position: absolute;
    top: -7px;
    left: 0px;
    width: 22px;
    height: 22px;
    background-color: gray;
    border: var(--border-width) solid white;
    border-radius: 4px;
    transition: 0.1s linear;
    transform: translateX(-6px);
}

.toggleInput:checked+.toggleSlider {
    background-color: v-bind("$props.color1 ?? '#0C0'");
}

.toggleInput:checked+.toggleSlider::before {
    transform: translateX(14px);
}

.toggleDisabled {
    border-color: #555 !important;
    cursor: not-allowed;
}

.toggleDisabled .toggleSlider,
.toggleDisabled .toggleSlider::before {
    border-color: #555 !important;
    filter: saturate(0.5);
    cursor: not-allowed;
}
</style>