<script setup lang="ts">
import { computed, ComputedRef, inject, provide, ref } from 'vue';
import { GroupTile } from '../tiles';
import BaseTile from './BaseTile.vue';
import StrictNumberInput from '@/components/inputs/StrictNumberInput.vue';
import ColorInput from '@/components/inputs/ColorInput.vue';
import Toggle from '@/components/inputs/Toggle.vue';

const props = defineProps<{
    tile: GroupTile
}>();

// group tiles within collapsed tile can't have borders because that uses background
const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));
provide('inCollapsedGroup', computed(() => props.tile.orientation == GroupTile.COLLAPSED || inCollapsedGroup.value));

const tileOrientation = computed<string>({
    get: () => props.tile.orientation.toString(),
    set: (val) => props.tile.orientation = Number(val)
});

// raw simply stores the color so toggling doesn't reset it (this is a bit weird but works)
const borderColorRaw = ref(props.tile.borderColors == 'transparent' ? '#FFFFFF' : props.tile.borderColors);
const transparentBorders = computed<boolean>({
    get: () => props.tile.borderColors == 'transparent',
    set: (val) => props.tile.borderColors = val ? 'transparent' : borderColorRaw.value
});
const borderColor = computed<string>({
    get: () => borderColorRaw.value,
    set: (color) => {
        borderColorRaw.value = color;
        props.tile.borderColors = transparentBorders.value ? 'transparent' : color;
    }
});
</script>

<template>
    <BaseTile :tile="props.tile" hide-header>
        <template v-slot:content>
            <div :class="{
                groupChildren: true,
                groupChildrenCollapsed: props.tile.orientation == GroupTile.COLLAPSED,
                groupChildrenInCollapsed: inCollapsedGroup
            }">
                <component v-for="child of tile.children" :key="child.id" :is="child.class.component" :tile="child"></component>
            </div>
        </template>
        <template v-slot:options>
            <label title="versfdsf">
                Orientation:
                <select v-model="tileOrientation">
                    <option value="0">Horizontal</option>
                    <option value="1">Vertical</option>
                    <option value="2">Collapsed</option>
                </select>
            </label>
            <label title="Relative size of tile to sibling tiles">
                Size:
                <StrictNumberInput v-model="props.tile.size" :min="1" :max="100"></StrictNumberInput>
            </label>
            <!-- only usable when not in collapsed tile and non transparent borders -->
            <label>
                Borders:
                <ColorInput v-model="borderColor" :disabled="transparentBorders"></ColorInput>
            </label>
            <!-- only usable when not in collapsed tile -->
            <label>
                Transparent:
                <Toggle v-model="transparentBorders"></Toggle>
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
    background-color: v-bind("$props.tile.borderColors");
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
}
</style>