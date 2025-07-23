<script setup lang="ts">
import { trixLoaded } from '@/trix';
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

// trix isn't made for vue so it's not reactive, hence all this weird stuff
const thisId: string = 'trixEditor' + globalIdCounter++;

const props = defineProps<{
    initialValue?: string
    minLines?: number
    maxLines?: number
    resizeable?: boolean
    disabled?: boolean
}>();

// there's no way to update the value of the editor after creating it so this is a one-way relationship
const inputEl = useTemplateRef('input');
const value = ref<string>(props.initialValue ?? '');

const emit = defineEmits<{
    (e: 'input', value: string): any
}>();

function trixUpdate() {
    if (inputEl.value !== null && value.value !== inputEl.value.value) {
        value.value = inputEl.value.value;
        emit('input', value.value);
        console.log(inputEl.value.value)
    }
}
onMounted(() => document.addEventListener('trix-change', trixUpdate));
onUnmounted(() => document.removeEventListener('trix-change', trixUpdate));
</script>
<script lang="ts">
// this is an incredibly scuffed way to do this, on the verge of being completely scraped to bits
let globalIdCounter = 0;
</script>

<template>
    <div class="editorContainer" v-if="trixLoaded">
        <input :id="thisId" ref="input" type="hidden" :name="'trix content ' + thisId" :value="value" v-model="value">
        <trix-toolbar :id="thisId + 'a'"></trix-toolbar>
        <trix-editor :input="thisId" :toolbar="thisId + 'a'" :disabled="props.disabled"></trix-editor>
    </div>
</template>

<style>
.editorContainer {
    display: flex;
    flex-direction: column;
    width: 100%;
}

trix-editor {
    min-height: v-bind("($props.minLines ?? 0) * 12 + 'em'") !important;
    max-height: v-bind("($props.maxLines ?? -1) * 12 + 'em'") !important;
    height: 60em;
    resize: v-bind("$props.resizeable ? 'vertical' : 'none'")
}

pre {
    /* no scrollbar 4 u */
    overflow-x: hidden;
}
</style>