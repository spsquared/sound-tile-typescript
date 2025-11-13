<script setup lang="ts">
import { ref, useTemplateRef, watch } from 'vue';
import TileEditor from '@/visualizer/editor';
import MediaPlayer from '@/visualizer/mediaPlayer';
import { VisualizerRenderer } from '@/visualizer/visualizerRenderer';
import FullscreenModal from '../FullscreenModal.vue';
import { GroupTile } from '@/visualizer/tiles';
import { sleep } from '../utils';
import xue9_unknown from '@/img/xue9-unknown.jpg';

let activated = window.localStorage.getItem('xue9') !== null || false;
const spooky = ref(false);
const modal = useTemplateRef('modal');
type Message = { html: string, effect?: () => any } & ({ children: [Message, Message] } | { terminal: true } | { ohno: true });
const messageTree: Message = (() => {
    const youTriedToLeave2: Message = {
        html: '<span style="color: red">WELL▔YOU DON▋T GET TO🬇🬇!</span>',
        children: [
            {
                html: '<span style="color: red">Watch your step.</span>',
                children: [
                    {
                        html: 'Wouldn\'t want to hurt yourself.',
                        terminal: true
                    },
                    {
                        html: '<span style="color: red">S🬞 CLEVER▄HUH▀??🬳?</span>',
                        effect: async () => {
                            document.body.classList.add('red');
                            await sleep(100);
                            spooky.value = true;
                            TileEditor.state.dropdownOpen = true;
                            TileEditor.state.sidebarOpen = true;
                            for (let i = 0; i < 5; i++) {
                                document.body.classList.remove('red');
                                await sleep(50);
                                document.body.classList.add('red');
                                await sleep(50);
                            }
                            window.print();
                            window.print();
                            for (;;) console.error(new SyntaxError('Unexpected identifier in JSON at position undefined'));
                        },
                        ohno: true
                    }
                ]
            },
            {
                html: '<span style="color: red">WATCH YOUR STEP.</span>',
                terminal: true
            }
        ]
    };
    const youTriedToLeave: Message = {
        html: '<span style="color: red">YOU THOUG▇T YOU COULD LEAVE?�🬇</span><br>HOW IMP🬓LITE OF▃YOU.',
        effect: async () => {
            document.body.classList.add('red');
            await sleep(50);
            document.body.classList.remove('red');
            await sleep(100);
            document.body.classList.add('red');
            await sleep(50);
            document.body.classList.remove('red');
        },
        children: [
            {
                html: '<span style="color: red">IS THAT WHAT YOU THINK 🬺F YOURSELF?</span>',
                children: [youTriedToLeave2, youTriedToLeave2]
            },
            youTriedToLeave2
        ]
    };
    return {
        html: 'The Tutorial Master Says Hello',
        children: [
            {
                html: 'Let\'s make an agreement.',
                effect: () => {
                    TileEditor.state.dropdownOpen = false;
                    TileEditor.state.sidebarOpen = false;
                },
                children: [
                    {
                        html: 'Keep your nose out of my territory and I\'ll keep mine out of your existence.',
                        children: [
                            {
                                html: 'Chop chop! back to work!',
                                terminal: true
                            },
                            {
                                html: 'Alright then...<br><span color="red">Watch your step, buddy.</span>',
                                terminal: true
                            }
                        ]
                    },
                    youTriedToLeave
                ]
            },
            youTriedToLeave
        ]
    } satisfies Message;
})();
const message = ref<Message>(messageTree);
let hostageData: GroupTile | null = null;
watch(() => TileEditor.root.label, async () => {
    if (!activated && TileEditor.root.label.includes('Tutorial')) {
        activated = true;
        window.localStorage.setItem('xue9', '');
        message.value = messageTree;
        await sleep(200);
        spooky.value = true;
        await sleep(80);
        spooky.value = false;
        MediaPlayer.pause();
        TileEditor.state.dropdownOpen = true;
        await sleep(300);
        let vol = MediaPlayer.state.volume;
        MediaPlayer.state.volume = 100;
        await sleep(40);
        spooky.value = true;
        MediaPlayer.play();
        await sleep(20);
        spooky.value = false;
        await sleep(60);
        spooky.value = true;
        VisualizerRenderer.debugInfo = 2;
        MediaPlayer.pause();
        await sleep(100);
        spooky.value = false;
        MediaPlayer.state.mediaDataTabOpen = true;
        let mediaA = MediaPlayer.media.current.title;
        let mediaB = MediaPlayer.media.current.subtitle;
        let mediaC = MediaPlayer.media.current.coverArt;
        MediaPlayer.media.current.title = 'NOT�32m�';
        MediaPlayer.media.current.subtitle = 'TutorialMaster��';
        MediaPlayer.media.current.coverArt = xue9_unknown;
        document.body.classList.add('red');
        await sleep(50);
        document.body.classList.remove('red');
        await sleep(150);
        MediaPlayer.state.volume = vol;
        MediaPlayer.play();
        await sleep(400);
        document.body.classList.add('red');
        await sleep(50);
        document.body.classList.remove('red');
        await sleep(100);
        MediaPlayer.pause();
        await sleep(1000);
        hostageData = TileEditor.detachRoot();
        await sleep(1000);
        spooky.value = true;
        await sleep(100);
        MediaPlayer.media.current.title = mediaA;
        MediaPlayer.media.current.subtitle = mediaB;
        MediaPlayer.media.current.coverArt = mediaC;
        MediaPlayer.state.mediaDataTabOpen = false;
        await sleep(1200);
        modal.value?.open();
    }
});
function futilelyTryClose(ok: boolean) {
    if ('terminal' in message.value) {
        spooky.value = false;
        if (hostageData !== null) TileEditor.attachRoot(hostageData);
        VisualizerRenderer.debugInfo = 0;
        hostageData = null;
        TileEditor.root.label = 'Warning';
        return;
    }
    if ('ohno' in message.value) return;
    if (ok) message.value = message.value.children[0];
    else message.value = message.value.children[1];
    if (message.value.effect !== undefined) message.value.effect();
    modal.value?.open();
}
</script>

<template>
    <FullscreenModal ref="modal" :mode="'ohno' in message ? 'none' : 'confirm_warn'" effect="frost-screen" title="" @close="futilelyTryClose">
        <div id="xue9-bg"></div>
        <img id="xue9-unknown" :src="xue9_unknown"></img>
        <div id="ss-noise"></div>
        <div id="ss-lines"></div>
        <div id="ss-flick"></div>
        <div id="ss-rad"></div>
        <div id="ss-strobe"></div>
        <h3 v-html="message.html"></h3>
    </FullscreenModal>
    <div id="xue9-block" v-if="spooky"></div>
</template>

<style>
body.red #dropdown *,
body.red #sidebar *,
body.red #tileRoot * {
    background-color: red !important;
}
</style>
<style scoped>
#xue9-unknown {
    height: 5em;
    image-rendering: pixelated;
}

#xue9-bg {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: hsl(3, 100%, 15%);
    z-index: -1;
}

#xue9-block {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    background-image: v-bind('`url("${xue9_unknown}")`');
    background-position: center;
    background-size: 5vh;
    background-repeat: no-repeat;
    animation: 100ms cubic-bezier(0.5, -2, 0.25, 1) xue9;
}

@keyframes xue9 {
    from {
        background-color: white;
    }

    to {
        background-color: transparent;
    }
}

#ss-rad,
#ss-flick,
#ss-lines,
#ss-strobe,
#ss-noise {
    position: fixed;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 999999;
}

#ss-rad {
    background-image: radial-gradient(rgba(255, 200, 160, 0.03) 0%, rgba(0, 0, 0, 0.3) 100%);
}

#ss-flick {
    background-color: rgba(11, 8, 8, 0.1);
    animation: ss-flick 50ms infinite linear;
}

#ss-lines {
    background-image: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.3) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.03), rgba(0, 0, 255, 0.06));
    background-size: 100% 2px, 3px 100%;
}

#ss-strobe {
    background-image: linear-gradient(rgba(0, 0, 0, 0.2) 0%, transparent 100%);
    background-size: 100% 200px;
    background-repeat: no-repeat;
    animation: ss-line 5s infinite linear;
}

#ss-noise {
    top: -150%;
    left: -50%;
    width: 300%;
    background-color: rgba(255, 255, 255, 0.1);
    background-image: url(@/img/noise.png);
    background-size: auto;
    opacity: 0.2;
    animation: ss-grain 8s steps(10) infinite;
}

@keyframes ss-flick {
    0% {
        opacity: 0;
    }

    10% {
        opacity: 0.9;
    }

    20% {
        opacity: 1;
    }

    30% {
        opacity: 0;
    }

    40% {
        opacity: 0.9;
    }

    50% {
        opacity: 1;
    }

    60% {
        opacity: 0;
    }

    70% {
        opacity: 0.9;
    }

    80% {
        opacity: 1;
    }

    90% {
        opacity: 0;
    }

    100% {
        opacity: 0.9;
    }
}

@keyframes ss-line {
    0% {
        transform: translateY(100%);
    }

    100% {
        transform: translateY(-150px);
    }
}

@keyframes ss-grain {

    0%,
    100% {
        transform: translate(0, 0);
    }

    10% {
        transform: translate(-5%, -10%);
    }

    20% {
        transform: translate(-15%, 5%);
    }

    30% {
        transform: translate(7%, -25%);
    }

    40% {
        transform: translate(-5%, 25%);
    }

    50% {
        transform: translate(-15%, 10%);
    }

    60% {
        transform: translate(15%, 0%);
    }

    70% {
        transform: translate(0%, 15%);
    }

    80% {
        transform: translate(3%, 35%);
    }

    90% {
        transform: translate(-10%, 10%);
    }
}
</style>