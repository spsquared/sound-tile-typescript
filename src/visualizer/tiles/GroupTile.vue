<script setup lang="ts">
import { GroupTile } from '../tiles';
import BaseTile from './BaseTile.vue';

const props = defineProps<{
    tile: GroupTile
}>();
</script>

<template>
    <BaseTile :tile="props.tile" class="groupTile" hide-header>
        <div :class="{ groupChildren: true, groupChildrenCollapsed: props.tile.collapseChildren }">
            <component v-for="child of tile.children" :is="child.class.component" :tile="child" :class="{ groupChildCollapsed: props.tile.collapseChildren }"></component>
        </div>
    </BaseTile>
</template>

<style scoped>
.groupTile {
    contain: layout;
}

.groupChildren {
    display: flex;
    width: 100%;
    height: 100%;
    background-color: v-bind("$props.tile.borderColors");
    flex-direction: v-bind("$props.tile.isVertical ? 'column' : 'row'");
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
</style>