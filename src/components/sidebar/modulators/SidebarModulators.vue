<script setup lang="ts">
import { computed, Raw, ref, useTemplateRef, watch } from 'vue';
import { useDebounce, useElementSize } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import { ImageTile, Tile, VisualizerTile } from '@/visualizer/tiles';
import Modulation from '@/visualizer/modulation';
import SidebarContentWrapper from '../SidebarContentWrapper.vue';
import ModulatorSourceItem from './ModulatorSourceItem.vue';
import ModulatorTargetItem from './ModulatorTargetItem.vue';
import ModulatorConnectionItem from './ModulatorConnectionItem.vue';

const splitPaneSize = ref(0.5);
const connectionsPaneSize = ref(0.25);
const container = useTemplateRef('container');
const { width } = useElementSize(container);
const horizontal = computed(() => width.value > 500);

const debouncedTiles = useDebounce(TileEditor.currentTiles, 100);
// so the thing I warned about in the TileEditor root tile comment is happening
// ref unwrapping FUCKS AROUND with MY SHIT and FOR WHAT??? 6 CHARACTERS SAVED WHEN TYPING????
// not to mention that it DESTROYS type annotations by giving you MASSIVE NESTED OBJECTS full of BULLSHIT
// instead of just giving you... idk... a CLASS NAME???
const sourceList = ref<{
    tile: Tile
    // misleading type here - it's not raw but this is easier than spaghetti reactive type or "any"
    // thanks vue for deleting my private members that are still there and then complaining that they're not there
    source: Raw<Modulation.Source<any>>
}[]>([]);
watch(debouncedTiles, () => {
    const tiles: typeof sourceList.value = [];
    for (const tile of debouncedTiles.value) {
        if (tile instanceof VisualizerTile) tiles.push({
            tile: tile,
            source: tile.modulator // this is actually reactive because it was pulled out of the reactive root tile
        });
    }
    sourceList.value = tiles;
}, {
    // onTrack: () => console.debug('track source list'),
    // onTrigger: () => console.debug('trigger source list change')
});
const targetList = ref<{
    tile: Tile
    // have to fake rawness because automatic ref unwrapping fucks around with the source class in connectedSources
    // even though for some fucking reason it's TOTALLY FINE in the code above
    // NO WAIT, NEVERMIND! PRIVATE MEMBERS ARE SHAFTED BY THE REACTIVE TYPE, IT'S NOT FINE
    target: Raw<Modulation.Target<any>>
}[]>([]);
watch(debouncedTiles, () => {
    const tiles: typeof targetList.value = [];
    for (const tile of debouncedTiles.value) {
        if (tile instanceof ImageTile) tiles.push({
            tile: tile,
            target: tile.modulation // also actually reactive but also tiles might not be reactive who knows??????????
        });
    }
    targetList.value = tiles;
}, {
    // onTrack: () => console.debug('track target list'),
    // onTrigger: () => console.debug('trigger target list change')
});
// this isnt cumbersome at all
const connectionList = computed<Modulation.Connection[]>(() => sourceList.value.flatMap(({ source }) =>
    // this is the kind of bullshit I have to pull because of ref unwrapping
    Object.entries(source.connectedTargets as any as typeof source.connectedTargets.value).flatMap(([sourceKey, targets]) =>
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

// need "as Tile" everywhere because of the stupid auto unwrap also obliterating private and protected members
function setTileHover(tile: Tile) {
    TileEditor.state.sidebarIdentifyTile = tile;
}
function resetTileHover() {
    TileEditor.state.sidebarIdentifyTile = null;
}

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
                    <ModulatorSourceItem v-for="s in sourceList" :key="s.tile.id" :label="s.source.label" :source="s.source" @mouseenter="setTileHover(s.tile as Tile)" @mouseleave="resetTileHover"></ModulatorSourceItem>
                </div>
                <div id="modTargetContainer" class="modGroupContainer">
                    <div class="modGroupTitle">Targets</div>
                    <ModulatorTargetItem v-for="t in targetList" :key="t.tile.id" :label="t.target.label" :target="t.target" @mouseenter="setTileHover(t.tile as Tile)" @mouseleave="resetTileHover"></ModulatorTargetItem>
                </div>
                <div id="modConnectionsContainer" class="modGroupContainer">
                    <div class="modGroupTitle">Connections</div>
                    <!-- using index is temporary but will probably stay forever - there aren't many things being updated anyway -->
                    <ModulatorConnectionItem v-for="c, i in connectionList" :key="i" :index="i" :connection="c"></ModulatorConnectionItem>
                </div>
                <div id="modConnectionsResize"></div>
                <div id="modSplitResize"></div>
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
    overflow-y: auto;
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
    z-index: 1;
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
    top: -100vh;
    left: -100vw;
    width: 200vw;
    height: 200vh;
}
</style>