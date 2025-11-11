<script setup lang="ts">
import TileEditor from '@/visualizer/editor';
import { GroupTile, Tile } from '@/visualizer/tiles';

const props = defineProps<{
    tile: Tile
}>();
</script>

<template>
    <div v-if="TileEditor.drag.drop.tile == props.tile && !TileEditor.drag.drop.createGroup && TileEditor.drag.drop.insertBefore" class="ghostTile ghostDropTarget"></div>
    <div class="ghostDropGroup">
        <!-- this part looks jank - handles dropping with group creation -->
        <div v-if="TileEditor.drag.drop.tile == props.tile && TileEditor.drag.drop.createGroup && TileEditor.drag.drop.insertBefore" class="ghostTile ghostDropTarget"></div>
        <div :class="{
            ghostTile: true,
            ghostTileGroup: props.tile instanceof GroupTile,
            ghostTileCollapsed: props.tile instanceof GroupTile && props.tile.orientation == GroupTile.COLLAPSED
        }">
            <template v-if="props.tile instanceof GroupTile">
                <TileDragGhostTile v-for="child of props.tile.children" :key="child.id.toString()" :tile="child"></TileDragGhostTile>
            </template>
        </div>
        <div v-if="TileEditor.drag.drop.tile == props.tile && TileEditor.drag.drop.createGroup && !TileEditor.drag.drop.insertBefore" class="ghostTile ghostDropTarget"></div>
    </div>
    <div v-if="TileEditor.drag.drop.tile == props.tile && !TileEditor.drag.drop.createGroup && !TileEditor.drag.drop.insertBefore" class="ghostTile ghostDropTarget"></div>
</template>

<style scoped>
.ghostDropGroup {
    grid-row: 1;
    grid-column: 1;
    box-sizing: border-box;
    display: flex;
    flex-direction: v-bind("TileEditor.drag.drop.newGroupVertical ? 'column' : 'row'");
    flex: v-bind("$props.tile.size");
    flex-basis: 0px;
    gap: 4px;
}

.ghostTile {
    grid-row: 1;
    grid-column: 1;
    box-sizing: border-box;
    margin: -2px -2px;
    border: 2px solid white;
    flex: v-bind("$props.tile.size");
    flex-basis: 0px;
}

.ghostTileGroup {
    display: flex;
    /* ($props.tile as GroupTile) creates a syntax error on line 3 for some reason */
    flex-direction: v-bind("$props.tile instanceof GroupTile && $props.tile.orientation == GroupTile.VERTICAL ? 'column' : 'row'");
    margin: 0px 0px;
    border: none;
    gap: 4px;
}

.ghostTileCollapsed {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr;
}

.ghostDropTarget {
    flex: v-bind("TileEditor.drag.current?.size");
    background-color: #FFF7;
}
</style>