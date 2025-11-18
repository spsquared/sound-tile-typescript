<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, shallowRef, useTemplateRef } from 'vue';
import { debouncedWatch, useElementSize } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import MediaPlayer from '@/visualizer/mediaPlayer';
import Modulation from '@/visualizer/modulation';
import { Tile } from '@/visualizer/tiles';
import SidebarContentWrapper from '../SidebarContentWrapper.vue';
import ModulatorSourceItem from '@/modulation/ModulatorSourceItem.vue';
import ModulatorTargetItem from '@/modulation/ModulatorTargetItem.vue';
import ModulatorConnectionItem from '@/modulation/ModulatorConnectionItem.vue';

const splitPaneSize = ref(0.5);
const connectionsPaneSize = ref(0.25);
const container = useTemplateRef('container');
const { width } = useElementSize(container);
const horizontal = computed(() => width.value > 500);

let resizingSplit = false;
let resizingConnections = false;
function mouseMove(e: MouseEvent) {
    // if any styling anywhere changes this is all borking
    if (resizingSplit) {
        if (horizontal.value) {
            const width = window.innerWidth * TileEditor.state.sidebarScreenWidth / 100 - 4;
            splitPaneSize.value = Math.max(0.3, Math.min(0.7, (e.clientX - window.innerWidth + width + 2) / (width)));
        } else {
            const height = (window.innerHeight - 40) * (1 - connectionsPaneSize.value) - 4;
            splitPaneSize.value = Math.max(0.3, Math.min(0.7, (e.clientY - 38) / height));
        }
        e.preventDefault();
    } else if (resizingConnections) {
        // this one's not perfect but who really cares that much
        connectionsPaneSize.value = Math.max(0.1, Math.min(0.5, 1 - ((e.clientY - 36) / (window.innerHeight - 36))));
        e.preventDefault();
    }
}
function beginResizeSplit(e: MouseEvent) {
    resizingSplit = true;
    mouseMove(e);
}
function beginResizeConnections(e: MouseEvent) {
    resizingConnections = true;
    mouseMove(e);
}
function endResize() {
    resizingSplit = false;
    resizingConnections = false;
}
onMounted(() => {
    document.addEventListener('mousemove', mouseMove);
    document.addEventListener('mouseup', endResize);
    document.addEventListener('blur', endResize);
});
onUnmounted(() => {
    document.removeEventListener('mousemove', mouseMove);
    document.removeEventListener('mouseup', endResize);
    document.removeEventListener('blur', endResize);
});

// so the thing I warned about in the TileEditor root tile comment is happening
// ref unwrapping FUCKS AROUND with MY SHIT and FOR WHAT??? 6 CHARACTERS SAVED WHEN TYPING????
// not to mention that it DESTROYS type annotations by giving you MASSIVE NESTED OBJECTS full of BULLSHIT
// instead of just giving you... idk... a CLASS NAME???

// update UI only when visible and when tiles settled
const debouncedTiles = ref<Set<Tile>>(new Set());
debouncedWatch([
    () => TileEditor.state.sidebarOpen && TileEditor.state.sidebarTab == 'modulators',
    TileEditor.currentTiles
], ([isVisible]) => {
    if (isVisible) debouncedTiles.value = TileEditor.currentTiles.value;
}, { debounce: 100, deep: false });
// thanks vue for deleting my private members that are still there and then complaining that they're not there
// ok for some reason this doesn't produce random ref unwrapping bullshit but the previous code using refs and watch functions did???
const sourceList = computed(() => {
    const tiles: Modulation.Source<any>[] = [];
    for (const tile of debouncedTiles.value) {
        if ('modulator' in tile) tiles.push((tile as Modulation.Modulator<any>).modulator); // this is actually reactive because it was pulled out of the reactive root tile
    }
    // hard coded non-tile modulators are put at the top of the list
    return tiles.sort((a, b) => ((a.tile?.id ?? 0n) - (b.tile?.id ?? 0n)) < 0 ? -1 : 1);
});
// have to fake rawness because automatic ref unwrapping fucks around with the source class in connectedSources
// even though for some fucking reason it's TOTALLY FINE in the code above
// NO WAIT, NEVERMIND! PRIVATE MEMBERS ARE SHAFTED BY THE REACTIVE TYPE, IT'S NOT FINE
// somehow its fine now WHAT THE FUCK
const targetList = computed(() => {
    const tiles: Modulation.Target<any>[] = [];
    for (const tile of debouncedTiles.value) {
        if ('modulation' in tile) tiles.push((tile as Modulation.Modulatable<any>).modulation); // also actually reactive but also tiles might not be reactive who knows??????????
    }
    return tiles.sort((a, b) => ((a.tile?.id ?? 0n) - (b.tile?.id ?? 0n)) < 0 ? -1 : 1);
});
// this isnt cumbersome at all
const connectionList = computed<Modulation.Connection[]>(() => sourceList.value.flatMap((source) =>
    // this is the kind of bullshit I have to pull because of ref unwrapping
    Object.entries(source.connectedTargets).flatMap(([sourceKey, targets]) =>
        targets.map(([target, targetKey, transforms]) => ({
            source: source,
            target: target,
            sourceKey: sourceKey,
            targetKey: targetKey,
            transforms: transforms
        }))
    )
), {
    // onTrack: () => console.debug('track connection list'),
    // onTrigger: () => console.debug('trigger connection list change')
}); // not as funny as 6 closing parenthesis mixed with a few braces

// passing in hovered element for drag-and-drop to get around big div covering the whole screen
// takes all the elements and then removes the first which is always the dragging thing
const hoveredElement = shallowRef<Element | null>(null);
provide('modulatorHoveredElement', hoveredElement);
function updateHoveredElements(e: MouseEvent) {
    if (TileEditor.modulatorDrag.source === null) return;
    hoveredElement.value = document.elementsFromPoint(e.clientX, e.clientY)[1] ?? null;
}
onMounted(() => document.addEventListener('mousemove', updateHoveredElements));
onUnmounted(() => document.removeEventListener('mousemove', updateHoveredElements));

// TODO: search bar in sources and targets for finding things in larger layouts (it just filters the labels)
</script>

<template>
    <!-- probably a lot of performance issues here with all the mapping in reactivity -->
    <!-- also can you tell I've given up writing good code and just spammed toRaw everywhere and something will inevitably break because of that -->
    <!-- update: no more toRaw spam but instead lots of casting -->
    <SidebarContentWrapper tab="modulators">
        <template v-slot:header>Modulators</template>
        <template v-slot:content>
            <div :id="horizontal ? 'modSplitContainerHorizontal' : 'modSplitContainerVertical'" ref="container">
                <div id="modSourceContainer" class="modGroupContainer">
                    <div class="modGroupTitle">Sources</div>
                    <ModulatorSourceItem :source="MediaPlayer.media.current.globalModulator"></ModulatorSourceItem>
                    <ModulatorSourceItem v-for="s in sourceList" :key="s.tile?.id.toString() ?? s.label" :source="s"></ModulatorSourceItem>
                </div>
                <div id="modTargetContainer" class="modGroupContainer">
                    <div class="modGroupTitle">Targets</div>
                    <ModulatorTargetItem v-for="t in targetList" :key="t.tile?.id.toString() ?? t.label" :target="t"></ModulatorTargetItem>
                </div>
                <div id="modConnectionsContainer" class="modGroupContainer">
                    <div class="modGroupTitle">Connections</div>
                    <!-- using index is temporary but will probably stay forever - there aren't many things being updated anyway -->
                    <ModulatorConnectionItem v-for="c, i in connectionList" :key="i" :index="i" :connection="c"></ModulatorConnectionItem>
                </div>
                <div id="modSplitResize" @mousedown="beginResizeSplit"></div>
                <div id="modConnectionsResize" @mousedown="beginResizeConnections"></div>
            </div>
        </template>
    </SidebarContentWrapper>
</template>

<style scoped>
#modSplitContainerVertical,
#modSplitContainerHorizontal {
    position: absolute;
    top: 0px;
    left: 0px;
    display: grid;
    width: 100%;
    height: 100%;
}

#modSplitContainerVertical {
    grid-template-rows: v-bind("`${splitPaneSize * (1 - connectionsPaneSize)}fr 4px ${(1 - splitPaneSize) * (1 - connectionsPaneSize)}fr 4px ${connectionsPaneSize}fr`");
    grid-template-columns: 1fr;
    grid-template-areas: "sources" "split-divider" "targets" "connections-divider" "connections";
}

#modSplitContainerHorizontal {
    grid-template-rows: v-bind("`${1 - connectionsPaneSize}fr 4px ${connectionsPaneSize}fr`");
    grid-template-columns: v-bind("`${splitPaneSize}fr 4px ${1 - splitPaneSize}fr`");
    grid-template-areas: "sources split-divider targets" "connections-divider connections-divider connections-divider" "connections connections connections";
}

#modSplitContainerHorizontal>#modSplitResize {
    cursor: ew-resize;
}

#modSourceContainer {
    grid-area: sources;
}

#modTargetContainer {
    grid-area: targets;
}

#modConnectionsContainer {
    grid-area: connections;
}

.modGroupContainer {
    display: flex;
    flex-direction: column;
    padding: 8px 8px;
    row-gap: 8px;
    /* sort of have to keep scrollbar gutter because of oscillating stuff */
    overflow-y: scroll;
}

.modGroupTitle {
    position: sticky;
    top: 0px;
    width: 100%;
    border-bottom: 4px solid #555;
    /* #333A is somehow consistent with #222 on a black background despite being arbitrary */
    background-image: linear-gradient(0deg, #333A 0%, #222 80%);
    backdrop-filter: blur(1px);
    font-size: 16px;
    text-align: center;
    user-select: none;
    /* make sure title renders above connection items and drag-and-drop dropdowns */
    z-index: 3;
}

.modGroupTitle::after {
    content: '';
    display: block;
    position: absolute;
    top: -8px;
    width: 100%;
    height: 8px;
    background-color: black;
}

#modSplitResize {
    grid-area: split-divider;
    background-color: white;
    cursor: ns-resize;
    /* fixes random selecting when resizing */
    user-select: none;
}

#modConnectionsResize {
    grid-area: connections-divider;
    background-color: white;
    cursor: ns-resize;
    /* do I have to explain myself a third time? */
    user-select: none;
}

#modSplitResize:active::after,
#modConnectionsResize:active::after {
    content: ' ';
    /* another cursor interaction thing (too bad it doesn't work outside of sidebar) */
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    z-index: 601;
}
</style>