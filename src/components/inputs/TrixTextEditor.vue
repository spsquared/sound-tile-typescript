<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue';

// trix isn't made for vue so it's not reactive, hence all this weird stuff
const thisId: string = 'trixEditor' + globalIdCounter++;

const props = defineProps<{
    initialValue?: string
}>();

// there's no way to update the value of the editor after creating it so this is a one-way relationship
const inputEl = useTemplateRef('input');
const value = ref<string>(props.initialValue ?? '');

const emit = defineEmits<{
    (e: 'input', value: string): any
}>();

function trixUpdate() {
    if (inputEl.value !== null) {
        value.value = inputEl.value.value;
        emit('input', value.value);
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
    <div>
        <input :id="thisId" ref="input" type="hidden" :name="'trix content ' + thisId" v-model="value">
        <trix-editor :input="thisId"></trix-editor>
    </div>
</template>

<style>
trix-toolbar {
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
}

.trix-button-row {
    display: flex;
    flex-direction: row;
}

trix-editor {
    padding: 0.2em 0.1em;
    border: 2px solid #AAA;
    border-radius: 4px;
    background-color: #222;
}

trix-editor:focus-visible {
    border-color: white;
}
</style>