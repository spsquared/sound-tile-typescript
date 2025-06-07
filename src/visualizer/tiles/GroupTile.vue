<script setup lang="ts">
import { computed, ComputedRef, inject, provide } from 'vue';
import { GroupTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: GroupTile
}>();

// group tiles within collapsed tile can't have background
provide('inCollapsedGroup', computed(() => props.tile.orientation == GroupTile.COLLAPSED));
const inCollapsedGroup = inject<ComputedRef<boolean>>('inCollapsedGroup', computed(() => false));
</script>

<template>
    <BaseTile :tile="props.tile" hide-header>
        <template v-slot:content>
            <div :class="{
                groupChildren: true,
                groupChildrenCollapsed: props.tile.orientation == GroupTile.COLLAPSED,
                groupChildrenInCollapsed: inCollapsedGroup
            }">
                <component v-for="child of tile.children" :key="child.id" :is="child.class.component" :tile="child" :class="{ groupChildCollapsed: props.tile.orientation == GroupTile.COLLAPSED }"></component>
            </div>
        </template>
    </BaseTile>
</template>

<style scoped>
.groupChildren {
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
    background-color: black;
}

.groupChildCollapsed {
    grid-row: 1;
    grid-column: 1;
    background-color: transparent;
}

.groupChildrenInCollapsed {
    background-color: transparent;
}
</style>