<script setup lang="ts">
import SidebarContentWrapper from '../SidebarContentWrapper.vue';

</script>

<template>
    <SidebarContentWrapper tab="sources">
        <template v-slot:header>Sources</template>
        <template v-slot:content>
            wow look at all those sources
        </template>
    </SidebarContentWrapper>
</template>

<style scoped></style>