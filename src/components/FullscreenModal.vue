<script setup lang="ts">
import { Ref, ref, useTemplateRef, watch } from 'vue';
import { createFocusTrap, FocusTrap } from 'focus-trap';
import { matchInput } from '@/constants';
import { AsyncLock } from './lock';

const props = defineProps<{
    /**Modal title - can coexist with the "title" slot */
    title?: string
    /**Determines acknowledgement options for the user */
    mode: ModalMode
    /**Color of modal border */
    color?: string
    /**
     * Background effect
     * - frost-window: frosted glass window background and dimmed screen, disables scroll fading under title & buttons
     * - frost-screen: opaque window background and frosted screen
     * - dim-screen: opaque window background and dimmed screen (default)
     */
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
        document.addEventListener('keydown', keydown, { passive: true });
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
            initialFocus: body.value.querySelector('.modalButton') as HTMLElement ?? undefined
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
export type ModalMode = 'info' | 'notify' | 'confirm' | 'confirm_warn' | 'input' | 'input_warn' | 'none';
</script>

<template>
    <Teleport to="#root">
        <Transition @after-enter="emit('open-settled')" @after-leave="emit('close-settled')">
            <div :class="{ modalContainer: true, modalContainerFrost: props.effect == 'frost-screen' }" v-if="open">
                <div :class="{ modalBody: true, modalBodyFrost: props.effect == 'frost-window' }" ref="body">
                    <h1 :class="{ modalTitle: true, modalTitleBackground: props.effect != 'frost-window' }">
                        <slot name="title">{{ props.title ?? '' }}</slot>
                    </h1>
                    <div class="modalContent">
                        <slot :close="close"></slot>
                    </div>
                    <div :class="{ modalButtons: true, modalButtonsBackground: props.effect != 'frost-window' }" v-if="props.mode != 'none' || $slots.buttons !== undefined">
                        <slot name="buttons" :close="close"></slot>
                        <template v-if="props.mode == 'info'">
                            <input type="button" value="CLOSE" class="modalButton" @click="close(true)">
                        </template>
                        <template v-if="props.mode == 'notify'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)">
                        </template>
                        <template v-else-if="props.mode == 'confirm'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)" style="background-color: red;">
                        </template>
                        <template v-else-if="props.mode == 'confirm_warn'">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: red;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)">
                        </template>
                        <template v-else-if="props.mode == 'input'">
                            <input type="button" value="YES" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="NO" class="modalButton" @click="close(false)" style="background-color: red;">
                        </template>
                        <template v-else-if="props.mode == 'input_warn'">
                            <input type="button" value="YES" class="modalButton" @click="close(true)" style="background-color: red;">
                            <input type="button" value="NO" class="modalButton" @click="close(false)" style="background-color: green;">
                        </template>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.modalContainer {
    display: grid;
    grid-template-rows: 2vh 1fr min-content 1fr 2vh;
    grid-template-columns: 2vw 1fr minmax(50vw, min-content) 1fr 2vw;
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

@media (max-width: 600px) {
    .modalContainer {
        grid-template-columns: 1vw 1fr minmax(90vw, min-content) 1fr 1vw;
    }
}

.modalBody {
    grid-row: 3;
    grid-column: 3;
    contain: content;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    position: relative;
    bottom: calc(50vh + 50%);
    min-width: 0px;
    max-width: 96vw;
    max-height: 96vh;
    border: 4px solid white;
    border-radius: 8px;
    background-color: black;
    transition: 400ms ease-in-out transform;
    transform: translateY(calc(50vh + 50%));
    text-align: center;
    overflow-y: auto;
}

.modalBodyFrost {
    background-color: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(20px);
}

.modalTitle {
    position: sticky;
    top: 0px;
    margin: 0px 0px 12px 0px;
    padding-top: 12px;
    font-size: 40px;
}

.modalTitleBackground {
    background-color: black;
    box-shadow: 0px 0px 6px 6px black;
    z-index: 1;
}

.modalContent {
    padding: 0px 16px;
}

.modalButtons {
    position: sticky;
    bottom: 0px;
    margin-top: 12px;
    padding: 0px;
    padding-bottom: 16px;
}

.modalButtonsBackground {
    background-color: black;
    box-shadow: 0px 0px 6px 6px black;
    z-index: 1;
}

.modalButton {
    width: 80px;
    height: 32px;
    border: 4px solid white;
    border-radius: 2px;
    margin: 0px 4px;
    background-color: #555;
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