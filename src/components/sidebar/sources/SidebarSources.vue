<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, useTemplateRef, watch } from 'vue';
import { debouncedWatch, throttledWatch } from '@vueuse/core';
import TileEditor from '@/visualizer/editor';
import MediaPlayer from '@/visualizer/mediaPlayer';
import { Tile, VisualizerTile } from '@/visualizer/tiles';
import { ReuseVisualizerSource } from './reuseSource';
import SidebarContentWrapper from '../SidebarContentWrapper.vue';
import SourceItem from './SourceItem.vue';

const sidebarVisible = computed(() => TileEditor.state.sidebarOpen && TileEditor.state.sidebarTab == 'sources');

// update UI only when visible and when tiles settled
const debouncedTiles = ref<Set<Tile>>(new Set());
debouncedWatch([
    sidebarVisible,
    TileEditor.currentTiles
], () => {
    if (sidebarVisible.value) debouncedTiles.value = TileEditor.currentTiles.value;
}, { debounce: 100, deep: false });

// sources mapped to tile sets
const sources = computed(() => {
    const collectedSources: Map<ArrayBuffer, Set<VisualizerTile>> = new Map();
    for (const tile of debouncedTiles.value) {
        if (tile instanceof VisualizerTile && tile.visualizer.data.buffer !== null) {
            const buffer = tile.visualizer.data.buffer;
            if (!collectedSources.has(buffer)) collectedSources.set(buffer, new Set());
            collectedSources.get(buffer)!.add(tile);
        }
    }
    return [...collectedSources.entries()].map<{
        buffer: ArrayBuffer
        tiles: Set<VisualizerTile>
        key: string
    }>(([buffer, tiles]) => {
        // hopefully consistent keys
        const key = tiles.values().next().value?.id.toString() ?? 'uh oh empty';
        return {
            buffer: buffer,
            tiles: tiles,
            key: key
        };
    });
});

// the source preview gets its own audio context
const audioContext = new AudioContext();
const gain = audioContext.createGain();
gain.connect(audioContext.destination);
watch(() => MediaPlayer.state.volume, () => gain.gain.value = MediaPlayer.state.volume, { immediate: true });
onUnmounted(() => audioContext.close());

// playback handled here, source items just make the UI
const playbackNodes: Map<string, {
    buffer: AudioBuffer,
    node: AudioBufferSourceNode | null
}> = reactive(new Map());
throttledWatch(sources, async () => {
    // diff system, avoids decoding all audio on every tiny change (REALLY BAD!!!)
    const newKeys = new Set<String>();
    for (const { buffer, key } of sources.value) {
        newKeys.add(key);
        if (!playbackNodes.has(key)) audioContext.decodeAudioData(buffer.slice()).then((buffer) => {
            playbackNodes.set(key, {
                buffer: buffer,
                node: null
            });
        });
    }
    for (const [key, node] of playbackNodes) {
        if (!newKeys.has(key)) {
            node.node?.stop();
            node.node?.disconnect();
            playbackNodes.delete(key);
        }
    }
}, { throttle: 500, leading: true, trailing: true });

const sourceItems = useTemplateRef('sourceItems');
function playPreview(sourceKey: string, t: number) {
    const node = playbackNodes.get(sourceKey);
    if (node === undefined) return;
    if (sourceItems.value !== null) for (const source of sourceItems.value) {
        if (source?.$props.sourceKey !== sourceKey) source?.forcePause(); // me when I add entire prop for this
    }
    for (const node of playbackNodes.values()) {
        node.node?.stop();
        node.node?.disconnect();
    }
    node.node = audioContext.createBufferSource();
    node.node.buffer = node.buffer;
    node.node.connect(gain);
    node.node.start(audioContext.currentTime, t);
}
function pausePreview(sourceKey: string) {
    const node = playbackNodes.get(sourceKey);
    if (node === undefined) return;
    node.node?.stop();
    node.node?.disconnect();
}
watch(sidebarVisible, () => {
    if (!sidebarVisible.value) {
        if (sourceItems.value !== null) for (const source of sourceItems.value) {
            source?.forcePause();
        }
        for (const node of playbackNodes.values()) {
            node.node?.stop();
            node.node?.disconnect();
            node.node = null;
        }
        audioContext.suspend();
    } else audioContext.resume();
});

// automatically opening the sidebar and canceling if navigated away
watch(ReuseVisualizerSource.active, () => {
    if (ReuseVisualizerSource.active.value) {
        TileEditor.state.sidebarOpen = true;
        TileEditor.state.sidebarTab = 'sources';
        TileEditor.state.hideTabs = false;
    }
});
watch(() => TileEditor.state.sidebarOpen && TileEditor.state.sidebarTab == 'sources', (isOpen) => {
    if (!isOpen && ReuseVisualizerSource.active.value) ReuseVisualizerSource.cancelSource();
});
</script>

<template>
    <SidebarContentWrapper tab="sources">
        <template v-slot:header>
            {{ ReuseVisualizerSource.active.value ? 'Select Source' : 'Sources' }}
            <input type="button" class="cancelReuseSource" v-if="ReuseVisualizerSource.active.value" @click="ReuseVisualizerSource.cancelSource">
        </template>
        <template v-slot:content>
            <SourceItem v-for="source in sources" :key="source.key" ref="sourceItems" :source-key="source.key" :buffer="source.buffer" :tiles="source.tiles" :preview-duration="playbackNodes.get(source.key)?.buffer.duration" :play-preview="(t) => playPreview(source.key, t)" :pause-preview="() => pausePreview(source.key)"></SourceItem>
            <div class="noSources" v-if="sources.length == 0">
                No sources added!
                <br>
                Yes there will be a tutorial button here at some point
            </div>
        </template>
    </SidebarContentWrapper>
</template>

<style scoped>
.cancelReuseSource {
    width: 28px;
    height: 20px;
    background-color: red;
    background-image: url(@/img/close.svg);
    background-position: center;
    background-size: 80% 80%;
    background-repeat: no-repeat;
}

.cancelReuseSource:hover {
    background-color: tomato;
}

.noSources {
    margin-top: 1em;
    text-align: center;
}
</style>