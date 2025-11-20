<script setup lang="ts">
import { Ref, ref, useTemplateRef, watch } from 'vue';
import { createFocusTrap, FocusTrap } from 'focus-trap';
import { matchInput } from '@/constants';
import { AsyncLock } from './lock';

const props = defineProps<{
    /**Modal title */
    title: string
    /**Determines acknowledgement options for the user */
    mode: ModalMode
    /**Color of modal border */
    color?: string
    /**Background effect */
    effect?: 'frost-window' | 'frost-screen' | 'dim-screen' // default is dim-screen
}>();

const open = defineModel({ default: false });
const openLock = new AsyncLock();
const result = ref(false);

const body = useTemplateRef('body');

// v-bind doens't work within <Teleport> elements so we do this mess instead
watch([() => props.color, body], () => body.value !== null && (body.value.style.borderColor = props.color ?? 'white'), { immediate: true });


const emit = defineEmits<{
    (e: 'open'): any
    (e: 'close', res: boolean): any
    (e: 'open-settled'): any
    (e: 'close-settled'): any
}>();

let ftrap: FocusTrap | undefined = undefined;
function close(res: boolean) {
    open.value = false;
    openLock.release();
    result.value = res;
    emit('close', res);
}
watch(open, () => {
    if (open.value) {
        openLock.acquire();
        document.addEventListener('keydown', keydown);
        emit('open');
    } else {
        ftrap?.deactivate();
        document.removeEventListener('keydown', keydown);
    }
});
function keydown(e: KeyboardEvent) {
    if (!open.value) return;
    const key = e.key.toLowerCase();
    // in this case we don't want enter on a button to confirm the modal since it breaks keyboard accessibility
    if (matchInput(e.target)) return;
    if (key == 'escape') close(false);
    else if (key == 'enter') close(true);
}
watch(body, () => {
    // this bit manages focus, depends on template refs
    if (body.value !== null) {
        ftrap = createFocusTrap(body.value, {
            onDeactivate: () => close(false),
            initialFocus: body.value.querySelector('.modalButton') as HTMLElement
        });
        ftrap.activate();
    }
});

defineExpose<{
    open: () => void
    openAsync: () => Promise<boolean>
    isOpen: Ref<boolean>
}>({
    open: () => {
        open.value = true;
    },
    openAsync: async () => {
        open.value = true;
        // jank as hell but works I think
        await openLock.acquire();
        openLock.release();
        return result.value;
    },
    isOpen: open
});
</script>
<script lang="ts">
export type ModalMode = 'notify' | 'confirm' | 'confirm_warn' | 'input' | 'input_warn' | 'none';
</script>

<template>
    <Teleport to="#root">
        <Transition @after-enter="emit('open-settled')" @after-leave="emit('close-settled')">
            <div :class="{ modalContainer: true, modalContainerFrost: props.effect == 'frost-screen' }" v-if="open">
                <div :class="{ modalBody: true, modalBodyFrost: props.effect == 'frost-window' }" ref="body">
                    <h1>{{ props.title }}</h1>
                    <slot :close="close"></slot>
                    <div class="modalButtons" v-if="props.mode != 'none'">
                        <span v-if="props.mode == 'notify'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)">
                        </span>
                        <span v-else-if="props.mode == 'confirm'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == 'confirm_warn'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: red;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)">
                        </span>
                        <span v-else-if="props.mode == 'input'">
                            <input type="button" value="YES" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="NO" class="modalButton" @click="close(false)" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == 'input_warn'">
                            <input type="button" value="YES" class="modalButton" @click="close(true)" style="background-color: red;">
                            <input type="button" value="NO" class="modalButton" @click="close(false)" style="background-color: green;">
                        </span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modalContainer {
    display: grid;
    grid-template-rows: 1fr min-content 1fr;
    grid-template-columns: 1fr 50vw 1fr;
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    transition: 300ms linear opacity;
    z-index: 1000;
}

.modalContainerFrost {
    backdrop-filter: blur(4px);
}

@media (max-width: 500px) {
    .modalContainer {
        grid-template-columns: 1fr 90vw 1fr;
    }
}

.modalBody {
    grid-row: 2;
    grid-column: 2;
    contain: content;
    display: inline-block;
    position: relative;
    bottom: calc(50vh + 50%);
    min-width: 0px;
    padding: 4px 1em;
    background-color: black;
    border: 4px solid white;
    border-radius: 8px;
    transition: 400ms ease-in-out transform;
    transform: translateY(calc(50vh + 50%));
    text-align: center;
}

.modalBodyFrost {
    background-color: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(20px);
}

.modalBody h1 {
    margin: 0.25em 0px;
    font-size: 40px;
}

.modalButtons {
    margin: 16px 0px;
}

.modalButton {
    appearance: none;
    width: 80px;
    height: 32px;
    border: 4px solid white;
    border-radius: 2px;
    margin: 0px 4px;
    background-color: #555;
    color: white;
    font-size: 16px;
    transition: 50ms linear transform;
    transform: translateY(0px);
    cursor: pointer;
}

.modalButton:hover {
    transform: translateY(-2px);
}

.modalButton:active {
    transform: translateY(2px);
}

.modalButton:focus-visible {
    outline-color: black;
    outline-offset: -3px;
}

.v-enter-from,
.v-leave-to {
    opacity: 0;
}

.v-enter-to,
.v-leave-from {
    opacity: 1;
}

.v-enter-from>.modalBody,
.v-leave-to>.modalBody {
    transform: translateY(0px);
}

.v-enter-to>.modalBody,
.v-leave-from>.modalBody {
    transform: translateY(calc(50vh + 50%));
}
</style>