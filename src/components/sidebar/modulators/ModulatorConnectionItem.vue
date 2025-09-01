<script setup lang="ts">
import Modulation from '@/visualizer/modulation';

const props = defineProps<{
    index: number
    connection: Modulation.Connection
}>();
</script>

<template>
    <div>
        <span>{{ props.index + 1 }}</span>
        <span>{{ props.connection.source.label }} [ {{ props.connection.sourceKey }} ]</span>
        <img src="@/img/arrow-right.svg"></img>
        <span>{{ props.connection.target.label }} [ {{ props.connection.targetKey }} ]</span>
    </div>
</template>

<style scoped></style>