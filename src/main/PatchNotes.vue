<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core';
import { onMounted, reactive, ShallowRef, useTemplateRef } from 'vue';

const patchNotes = (await import('@/patchNotes')).patchNotes;

const versionContainers = useTemplateRef('versionContainers');
const visibilityStates = reactive<ShallowRef<boolean>[]>([]);
onMounted(() => {
    for (const container of versionContainers.value!) {
        visibilityStates.push(useElementVisibility(container));
    }
});

function scrollToVersion(version: string) {
    document.querySelector(`.notesScrollAnchor.v${version.replaceAll('.', '_')}`)?.scrollIntoView({ behavior: 'smooth' });
}
</script>
<script lang="ts">
const listItems = ['Breaking', 'Changes', 'Fixes', 'Notes'] as const;
type SectionIndex = Lowercase<typeof listItems[number]>;
</script>

<template>
    <div id="notesLayout">
        <div id="notesMain">
            <div class="notesVersion" v-for="version in patchNotes" ref="versionContainers" v-once>
                <div :class="['notesScrollAnchor', 'v' + version.version.replaceAll('.', '_')]"></div>
                <a :href="version.releaseURL" target="_blank" v-if="version.releaseURL !== undefined">
                    <h2>v{{ version.version }} {{ version.headline }}<div class="openExternalIcon"></div></h2>
                </a>
                <h2 v-else>v{{ version.version }} {{ version.headline }}</h2>
                <div class="notesVersionSection" v-html="version.description"></div>
                <!-- am smort -->
                <template v-for="section in listItems">
                    <template v-if="version[section.toLowerCase() as SectionIndex]!.length > 0">
                        <h3>{{ section }}</h3>
                        <div class="notesVersionSection">
                            <ul>
                                <li v-for="item in version[section.toLowerCase() as SectionIndex]!">
                                    <span v-html="typeof item == 'string' ? item : item[0]"></span>
                                    <ul style="font-weight: lighter;" v-if="typeof item != 'string'">
                                        <li v-for="sub in item[1]" v-html="sub"></li>
                                    </ul>
                                </li>
                            </ul>
                        </div>
                    </template>
                </template>
            </div>
        </div>
        <div id="notesSide">
            <div id="notesSideInner">
                <div :class="{
                    notesNavLabel: true,
                    notesNavLabelHighlighted: visibilityStates[i]?.value ?? false
                }" v-for="version, i in patchNotes" @click="scrollToVersion(version.version)">v{{ version.version }}</div>
            </div>
        </div>
    </div>
</template>

<style scoped>
#notesLayout {
    display: grid;
    grid-template-columns: 1fr min-content;
    column-gap: 16px;
    min-width: 65vw;
    /* this is literally going to break in the next 20 minutes when I edit some unrelated CSS */
    /* height: calc(96vh - 132px); */
    text-align: left;
    /* overflow-y: scroll; */
}

#notesMain {
    grid-column: 1;
    display: flex;
    flex-direction: column;
    row-gap: 16px;
}

#notesSide {
    grid-column: 2;
    background-color: #222;
}

#notesSideInner {
    display: flex;
    flex-direction: column;
    position: sticky;
    /* if the title size changes this breaks */
    top: 68px;
    width: 8em;
    text-wrap: nowrap;
}

.notesVersion {
    display: flex;
    flex-direction: column;
    font-size: 14px;
}

.notesScrollAnchor {
    /* scrolling the header into view puts it under the header so we do this */
    position: relative;
    top: -68px;
}

.notesVersion h2 {
    margin: 0px 0px;
    padding: 4px 8px;
    border-bottom: 4px solid #555;
    background-color: #222;
    color: white;
    text-align: left;
}

.notesVersion a {
    text-decoration: none;
}

.notesVersion a:hover>h2 {
    text-decoration: dodgerblue underline;
    background-color: #333;
}

.notesVersion h3 {
    padding: 0px 0.2em 4px 0.2em;
    border-bottom: 4px solid #333;
}

.openExternalIcon {
    display: inline-block;
    width: 1em;
    height: 1em;
    margin-left: 0.25em;
    mask-size: 1em;
    mask-repeat: no-repeat;
    mask-position: center;
    mask-image: url(@/img/open-external.svg);
    transform: translateY(0.15em);
    background-color: #555;
}

a:hover .openExternalIcon {
    background-color: dodgerblue;
}

.notesNavLabel {
    box-sizing: border-box;
    position: relative;
    font-size: 20px;
    padding: 4px 8px;
    transition: 50ms linear padding;
    cursor: pointer;
}

.notesNavLabel::after {
    content: ' ';
    position: absolute;
    top: 0px;
    left: 0px;
    min-width: 0px;
    height: 100%;
    background-color: dodgerblue;
    transition: 50ms linear min-width;
}

.notesNavLabel:hover,
.notesNavLabelHighlighted {
    background-color: #333;
}

.notesNavLabelHighlighted::after {
    min-width: 4px;
}

.notesNavLabel:hover {
    text-decoration: underline;
    padding-left: 12px;
    padding-right: 4px;
}

.notesNavLabel:hover::after {
    min-width: 8px;
}
</style>