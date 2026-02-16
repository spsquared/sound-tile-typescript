<script setup lang="ts">
import { computed, ComputedRef, inject, provide } from 'vue';
import { GroupTile } from '../tiles';
import Tile from './Tile.vue';
import TileOptionsSection from './options/TileOptionsSection.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import Toggle from '@/components/inputs/Toggle.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';

const props = defineProps<{
    tile: GroupTile
}>();

const isCollapsed = computed(() => props.tile.orientation == GroupTile.Orientation.COLLAPSED);

// group tiles within collapsed tile can't have borders because that uses background
const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));
provide('inCollapsedGroup', computed(() => isCollapsed.value || inCollapsedGroup.value));
</script>

<template>
    <Tile :tile="props.tile" :hide-header="!isCollapsed" :hide-edit="!isCollapsed" :ignore-collapsed-group="isCollapsed && !inCollapsedGroup">
        <template #content>
            <div :class="{
                groupChildren: true,
                groupChildrenCollapsed: isCollapsed,
                groupChildrenInCollapsed: inCollapsedGroup
            }">
                <component v-for="child of tile.children" :key="child.id.toString()" :is="child.class.component" :tile="child"></component>
            </div>
        </template>
        <template #options>
            <TileOptionsSection title="General">
                <label title="Label of tile">
                    Label
                    <input type="text" v-model="props.tile.label">
                </label>
                <label title="Relative size of tile to sibling tiles">
                    Size
                    <StrictNumberInput v-model="props.tile.size" :min="1" :max="100" :strict-max="Infinity"></StrictNumberInput>
                </label>
                <label title="Layout of child tiles within the group - collapsed groups come with a few caveats">
                    Layout
                    <select v-model="props.tile.orientation">
                        <option :value="GroupTile.Orientation.HORIZONTAL">Horizontal</option>
                        <option :value="GroupTile.Orientation.VERTICAL">Vertical</option>
                        <option :value="GroupTile.Orientation.COLLAPSED">Collapsed</option>
                    </select>
                </label>
                <label v-if="!inCollapsedGroup && !isCollapsed" title="Border style of tiles within the group">
                    Borders
                    <EnhancedColorPicker :picker="props.tile.borderColor"></EnhancedColorPicker>
                </label>
                <label v-if="!inCollapsedGroup && !isCollapsed" title="Disable borders and gaps between tiles within the group">
                    Hide Borders
                    <Toggle v-model="props.tile.hideBorders"></Toggle>
                </label>
                <label v-if="!inCollapsedGroup && isCollapsed" title="Background style of tile">
                    Background
                    <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
                </label>
            </TileOptionsSection>
        </template>
    </Tile>
</template>

<style scoped>
.groupChildren {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    background-color: black;
    background: v-bind("$props.tile.borderColor.cssStyle");
    flex-direction: v-bind("$props.tile.orientation == GroupTile.Orientation.VERTICAL ? 'column' : 'row'");
    align-items: stretch;
    justify-content: stretch;
    gap: v-bind("$props.tile.hideBorders ? '0px' : '4px'");
}

.groupChildrenCollapsed {
    display: grid;
    grid-template-rows: 1fr;
    grid-template-columns: 1fr;
    background-color: v-bind("$props.tile.backgroundColor.cssStyle");
}

.groupChildrenInCollapsed {
    background-color: transparent;
    gap: 0px;
}
</style>