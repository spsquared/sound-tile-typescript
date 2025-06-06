<script setup lang="ts">
const props = defineProps<{
    title: string
    mode: ModalMode
    color?: string
}>();

const open = defineModel({ default: false });

const emit = defineEmits<{
    (e: 'close', res: boolean): any
}>();
function close(res: boolean) {
    open.value = false;
    emit('close', res);
}
</script>
<script lang="ts">
export const enum ModalMode {
    NOTIFY,
    CONFIRM,
    CONFIRM_WARN,
    INPUT,
    INPUT_WARN
}
</script>

<template>
    <Teleport to="#root">
        <Transition>
            <div class="modalContainer" v-if="open">
                <div class="modalBody">
                    <h1>{{ props.title }}</h1>
                    <slot></slot>
                    <div class="modalButtons">
                        <span v-if="props.mode == ModalMode.NOTIFY">
                            <input type="button" value="OK" class="modalButton" @click="close(true)">
                        </span>
                        <span v-else-if="props.mode == ModalMode.CONFIRM">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == ModalMode.CONFIRM_WARN">
                            <input type="button" value="OK" class="modalButton" @click="close(true)" style="background-color: red;">
                            <input type="button" value="CANCEL" class="modalButton" @click="close(false)">
                        </span>
                        <span v-else-if="props.mode == ModalMode.INPUT">
                            <input type="button" value="YES" class="modalButton" @click="close(true)" style="background-color: green;">
                            <input type="button" value="NO" class="modalButton" @click="close(false)" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == ModalMode.INPUT_WARN">
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
    backdrop-filter: blur(2px);
    z-index: 1000;
}

@media (max-width: 500px) {
    .modalContainer {
        grid-template-columns: 1fr 90vw 1fr;
    }
}

.modalBody {
    grid-row: 2;
    grid-column: 2;
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

.modalBody h1 {
    margin: 0.25em 0px;
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