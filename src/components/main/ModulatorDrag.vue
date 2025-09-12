<script setup lang="ts">
import { useMouse } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import { ref, watch } from 'vue';

const mousePos = useMouse();

// track if target was found - only update while dragging, after dropping target is reset to null
const successfulDrag = ref(false);
watch([() => TileEditor.modulatorDrag.target !== null, () => TileEditor.modulatorDrag.source !== null], ([success]) => {
    if (TileEditor.modulatorDrag.source !== null) successfulDrag.value = success;
});
</script>

<template>
    <Transition>
        <div id="modulatorDragContainer" :class="{ dragSuccessful: successfulDrag, dragUnsuccessful: !successfulDrag }" v-if="TileEditor.modulatorDrag.source !== null">
            <div id="modulatorDragItem"></div>
        </div>
    </Transition>
</template>

<style scoped>
#modulatorDragContainer {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100vw;
    height: 100vh;
    user-select: none;
    cursor: grabbing;
    z-index: 1100;
}

#modulatorDragItem {
    position: absolute;
    top: v-bind("mousePos.y.value - 30 + 'px'");
    left: v-bind("mousePos.x.value - 30 + 'px'");
    width: 60px;
    height: 60px;
    /* prevents blending in with other logo-green items */
    background: radial-gradient(circle 30px at 50% 50%, var(--logo-green) 0%, var(--logo-green) 60%, color-mix(in hsl, var(--logo-green) 80%, #0005 20%) 60%, transparent 100%);
    border-radius: 50%;
    pointer-events: none;
}

.v-enter-active {
    transition: 200ms linear dummy;
}

.v-leave-active.dragSuccessful {
    transition: 200ms linear dummy;
    pointer-events: none;
}

.v-leave-active.dragUnsuccessful {
    transition: 800ms linear dummy;
    pointer-events: none;
}

.v-enter-active>#modulatorDragItem {
    transition: 200ms ease-out transform, 100ms linear opacity;
}

.v-leave-active.dragSuccessful>#modulatorDragItem {
    transition: 200ms ease-out transform, 200ms linear opacity;
}

.v-enter-from>#modulatorDragItem,
.v-leave-to.dragSuccessful>#modulatorDragItem {
    transform: scale(0.66);
    opacity: 0;
}

.v-enter-to>#modulatorDragItem,
.v-leave-from.dragSuccessful>#modulatorDragItem {
    transform: scale(1);
    opacity: 1;
}

.v-leave-active.dragUnsuccessful>#modulatorDragItem {
    transition: 800ms cubic-bezier(0.5, -0.4, 0.8, 0.5) transform;
}

.v-leave-from.dragUnsuccessful>#modulatorDragItem {
    transform: translateY(0px);
}

.v-leave-to.dragUnsuccessful>#modulatorDragItem {
    transform: translateY(100vh);
}
</style>