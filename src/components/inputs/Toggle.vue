<script setup lang="ts">
const props = defineProps<{
    title?: string
    color1?: string
    color2?: string
    color3?: string
    color4?: string
    icon?: string
    iconSize?: string
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
    <label :class="{ toggle: true, toggleDisabled: props.disabled }" :title="props.title">
        <input class="toggleInput" type="checkbox" @change="input" v-model="checked" :disabled="props.disabled">
        <div class="toggleSlider"></div>
    </label>
</template>

<style scoped>
.toggle {
    display: inline-block;
    vertical-align: top;
    position: relative;
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
    top: calc(5px - var(--border-width));
    left: calc(4px - var(--border-width));
    width: 34px;
    height: 12px;
    background-color: v-bind("$props.color1 ?? '#F00'");
    border: var(--border-width) solid white;
    transition: 0.1s linear background-color;
    pointer-events: none;
}

.toggleSlider::before {
    content: '';
    position: absolute;
    top: -5px;
    left: 0px;
    width: 22px;
    height: 22px;
    background-color: v-bind("$props.color3 ?? 'var(--input-color)'");
    border-radius: 4px;
    transition: 0.1s linear transform;
    transform: translateX(-4px);
    background-image: v-bind('`url("${$props.icon}")`');
    background-position: center;
    background-size: v-bind("iconSize ?? '80% 80%'");
    background-repeat: no-repeat;
}

.toggleInput:checked+.toggleSlider {
    background-color: v-bind("$props.color2 ?? '#0C0'");
}

.toggleInput:checked+.toggleSlider::before {
    transform: translateX(16px);
}

.toggle:hover .toggleSlider::before {
    background-color: v-bind("$props.color4 ?? 'var(--input-hover-color)'");
}

.toggleInput:focus-visible+.toggleSlider::before {
    outline: 2px solid white;
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