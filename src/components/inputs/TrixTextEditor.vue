<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import { trixLoaded } from './trix';

// trix isn't made for vue so it's not reactive, hence all this weird stuff
const thisId: string = 'trixEditor' + globalIdCounter++;

const props = defineProps<{
    initialValue?: string
    minLines?: number
    maxLines?: number
    noWrap?: boolean
    resizeable?: boolean
    disabled?: boolean
}>();

// there's no way to update the value of the editor after creating it so this is a one-way relationship
const inputEl = useTemplateRef('input');
const value = ref<string>(props.initialValue ?? '');

const emit = defineEmits<{
    (e: 'input', value: string): any
}>();

const editorEl = useTemplateRef<HTMLElement>('editor');
function trixUpdate() {
    if (inputEl.value !== null) {
        value.value = inputEl.value.value;
        emit('input', value.value);
    }
}
watch(editorEl, () => editorEl.value?.addEventListener('trix-change', trixUpdate));
</script>
<script lang="ts">
// this is an incredibly scuffed way to do this, on the verge of being completely scraped to bits
let globalIdCounter = 0;
</script>

<template>
    <div class="editorContainer" v-if="trixLoaded">
        <input :id="thisId" ref="input" type="hidden" :name="'trix content ' + thisId" :value="initialValue" v-model="value">
        <trix-editor ref="editor" :input="thisId" :toolbar="thisId + 'a'" :class="{ editorNoWrap: props.noWrap }" :disabled="props.disabled"></trix-editor>
        <trix-toolbar :id="thisId + 'a'"></trix-toolbar>
    </div>
    <div class="editorPlaceholder" v-else>
        Loading editor...
    </div>
</template>

<style scoped>
.editorContainer {
    display: flex;
    flex-direction: column-reverse;
    width: 100%;
}

trix-toolbar {
    --trix-border-color: #AAA !important;
}

trix-editor {
    min-height: v-bind("($props.minLines ?? 0) * 1.2 + 'em'") !important;
    max-height: v-bind("($props.maxLines ?? -1) * 1.2 + 'em'") !important;
    height: 6em;
    resize: v-bind("$props.resizeable ? 'vertical' : 'none'");
    border-color: #AAA !important;
}

trix-editor:focus-within {
    border-color: white !important;
}

trix-editor:focus-within+trix-toolbar {
    --trix-border-color: white !important;
}

trix-editor:not(:focus-within)::selection {
    background-color: #555;
}

.editorNoWrap {
    text-wrap: nowrap;
}

.editorPlaceholder {
    box-sizing: border-box;
    display: flex;
    width: 100%;
    height: 60px;
    border: 2px solid white;
    border-radius: 4px;
    align-items: center;
    justify-content: center;
    box-shadow: inset #FFFA 0px 0px 8px 2px;
}
</style>