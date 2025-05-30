<!-- oops i used options and composition api -->
<script setup lang="ts">
import { ref } from 'vue';
import { AsyncLock } from './util/lock';

const props = defineProps<{
    title: string
    mode: ModalMode
    color?: string
}>();

const lock = new AsyncLock();

const open = ref(false);
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
                            <input type="button" value="OK" class="modalButton">
                        </span>
                        <span v-else-if="props.mode == ModalMode.CONFIRM">
                            <input type="button" value="OK" class="modalButton" style="background-color: green;">
                            <input type="button" value="CANCEL" class="modalButton" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == ModalMode.CONFIRM_WARN">
                            <input type="button" value="OK" class="modalButton" style="background-color: red;">
                            <input type="button" value="CANCEL" class="modalButton">
                        </span>
                        <span v-else-if="props.mode == ModalMode.INPUT">
                            <input type="button" value="YES" class="modalButton" style="background-color: green;">
                            <input type="button" value="NO" class="modalButton" style="background-color: red;">
                        </span>
                        <span v-else-if="props.mode == ModalMode.INPUT_WARN">
                            <input type="button" value="YES" class="modalButton" style="background-color: red;">
                            <input type="button" value="NO" class="modalButton" style="background-color: green;">
                        </span>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
    <div class="modalContainer" :style="open ? 'opacity: 1; pointer-events: all;' : ''">
        <div class="modalBodyWrapper" :style="open ? 'transform: translateY(calc(50vh + 50%))' : ''">
        </div>
    </div>
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
    opacity: 0;
    transition: 300ms linear opacity;
    backdrop-filter: blur(2px);
    pointer-events: none;
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
    transition: 400ms ease-in-out transform;
    text-align: center;
}

.modalBody h1 {
    margin: 0px 0px;
    margin-top: 0.5em;
}

.modalButtons {
    margin: 8px 0px;
    margin-bottom: 16px;
}

.modalButton {

}
</style>