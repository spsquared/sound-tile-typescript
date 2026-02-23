import { reactive } from "vue";
import { merge } from "lodash-es";

/**
 * Whole-page configuration options for the user.
 */
export type GlobalSettings = {
    /**Toggle all frosted glass backgrounds and backdrops */
    frostedGlassEffects: boolean
    /**Default note colors for each channel/track of piano roll-type visualizers, wrapping around if out of bounds */
    defaultPianoNoteColors: {
        pitch: [string, string][]
        drum: [string, string][]
    }
};

export const settings = reactive<GlobalSettings>(merge({
    frostedGlassEffects: true,
    defaultPianoNoteColors: {
        pitch: [
            ['#92F9FF', '#00BDC7'],
            ['#FFFF92', '#C7C700'],
            ['#FFCDAB', '#FF771C'],
            ['#A0FFA0', '#00C700'],
            ['#FFC0FF', '#E040E0'],
            ['#D0D0FF', '#8888D0'],
            ['#E6FF92', '#AAC700'],
            ['#FFB2BB', '#FF4E63'],
            ['#83FFD9', '#00C78A'],
            ['#DFACFF', '#B757FF']
        ],
        drum: [
            ['#E0E0E0', '#A7A7A7'],
            ['#F0D0BB', '#CC9966'],
            ['#BBD7FF', '#6F9FCF'],
            ['#D4C1EA', '#9E71C1'],
            ['#C5E2B2', '#91AA66'],
        ]
    }
} satisfies GlobalSettings, JSON.parse(localStorage.getItem('settings') ?? '{}')));
