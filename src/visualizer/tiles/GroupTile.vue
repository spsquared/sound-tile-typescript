<script setup lang="ts">
import { computed, ComputedRef, inject, provide } from 'vue';
import { GroupTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import EnhancedColorPicker from '@/components/inputs/EnhancedColorPicker.vue';

const props = defineProps<{
    tile: GroupTile
}>();

const isCollapsed = computed(() => props.tile.orientation == GroupTile.COLLAPSED);

// group tiles within collapsed tile can't have borders because that uses background
const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));
provide('inCollapsedGroup', computed(() => isCollapsed.value || inCollapsedGroup.value));

const tileOrientation = computed<string>({
    get: () => props.tile.orientation.toString(),
    set: (val) => props.tile.orientation = Number(val)
});
</script>

<template>
    <BaseTile :tile="props.tile" :hide-header="!isCollapsed" :hide-edit="!isCollapsed" :ignore-collapsed-group="isCollapsed && !inCollapsedGroup">
        <template v-slot:content>
            <div :class="{
                groupChildren: true,
                groupChildrenCollapsed: isCollapsed,
                groupChildrenInCollapsed: inCollapsedGroup
            }">
                <component v-for="child of tile.children" :key="child.id" :is="child.class.component" :tile="child"></component>
            </div>
        </template>
        <template v-slot:options>
            <label title="versfdsf">
                Orientotation:
                <select v-model="tileOrientation">
                    <option :value="GroupTile.HORIZONTAL">Horizontal</option>
                    <option :value="GroupTile.VERTICAL">Vertical</option>
                    <option :value="GroupTile.COLLAPSED">Collapsed</option>
                </select>
            </label>
            <label title="Relative size of tile to sibling tiles">
                Size:
                <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
            </label>
            <!-- only usable when not in collapsed tile -->
            <label>
                Borders:
                <EnhancedColorPicker :picker="props.tile.borderColor"></EnhancedColorPicker>
            </label>
            <!-- only usable when is collapsed tile -->
            <label title="Background color of tile">
                Background:
                <EnhancedColorPicker :picker="props.tile.backgroundColor"></EnhancedColorPicker>
            </label>
            <br>
            dont worry this will get cleaned up
        </template>
    </BaseTile>
</template>

<style scoped>
.groupChildren {
    position: relative;
    display: flex;
    width: 100%;
    height: 100%;
    background-color: black;
    background: v-bind("$props.tile.borderColor.cssStyle");
    flex-direction: v-bind("$props.tile.orientation == GroupTile.VERTICAL ? 'column' : 'row'");
    align-items: stretch;
    justify-content: stretch;
    gap: 4px;
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