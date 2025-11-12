<script setup lang="ts">
import { ErrorQueue } from './errorQueue';
import FullscreenModal from './components/FullscreenModal.vue';
import { ref, useTemplateRef, watch } from 'vue';

const colorMap = {
    error: 'red',
    warning: 'gold',
    notice: 'white'
};

const modal = useTemplateRef('modal');
const error = ref<ErrorQueue.QueueEntry | undefined>(undefined);
function nextError() {
    ErrorQueue.queue.shift();
    error.value = ErrorQueue.queue[0];
    if (ErrorQueue.queue.length > 0) {
        modal.value?.open();
    }
}
watch(() => ErrorQueue.queue.length > 0, (open) => {
    if (open) {
        error.value = ErrorQueue.queue[0];
        modal.value?.open();
    }
});
</script>

<template>
    <FullscreenModal ref="modal" :title="error?.title ?? ''" mode="notify" :color="colorMap[error?.type ?? 'notice']" @close-settled="nextError">
        <span :style="{ color: colorMap[error?.type ?? 'notice'] }">
            {{ error?.message }}
        </span>
        <template v-if="(error?.type == 'error' || error?.type == 'warning') && 'stackTrace' in error">
            <br>
            <pre style="color: red">{{ error.stackTrace }}</pre>
        </template>
        <template v-else-if="error?.type == 'error' && error.filename !== undefined">
            <br>
            <span style="color: red">{{ error.filename }} {{ error.lineno }}:{{ error.colno }}</span>
        </template>
    </FullscreenModal>
</template>