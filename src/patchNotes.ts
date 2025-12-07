import { repositoryURL } from "./constants";

type PatchNoteEntry = {
    readonly version: string
    readonly releaseURL?: string
    readonly headline: string
    readonly description: string
    readonly breaking: readonly (string | readonly [string, string[]])[]
    readonly changes: readonly (string | readonly [string, string[]])[]
    readonly fixes: readonly (string | readonly [string, string[]])[]
    readonly notes: readonly (string | readonly [string, string[]])[]
};

export const patchNotes: readonly PatchNoteEntry[] = [
    {
        version: '2.0.1',
        releaseURL: 'https://github.com/spsquared/sound-tile-typescript/releases/tag/v2.0.1',
        headline: 'QoL improvements',
        description: `
            <p>
                Per user feedback, some minor changes have been made to make Sound Tile smoother to use.
                A number of bugs were squashed, too. Any and all constructive feedback is appreciated! You can
                <a href="${repositoryURL}/issues" target="_blank">create an issue on GitHub</a> or contact me directly.
            </p>
        `,
        breaking: [],
        changes: [
            'Added a second tile settings button to tile header bars',
            'Modulator targets will now scroll into view when hovered over, since manual scrolling is not possible in drag-and-drop',
            'Modulation targets now reset their values when connections are deleted',
            'Visualizer Tiles with the default label will append uploaded/reused source names',
            'Lowered the scrolling sensitivity of visualizer settings sliders',
            'Reversed order of modulation list to be more intuitive',
            'Allow bar widths >1 for some niche uses of bar mode',
            'Hide UI shortcuts (<code>SHIFT+H</code> and <code>SHIFT+E</code>) now hides most tile UI elements'
        ],
        fixes: [
            'Added missing entries to "connections" section of modulation sidebar tab',
            'Fixed memory management issue with modulator and sources sidebar tabs when closed',
            'Fixed new version message not showing',
            'Fixed Trix text editor changing font sizes of text when highlighting it',
            'Fixed issue that allowed disabled sliders to be scrolled',
            'Fixed scroll bars appearing when windows are moved to the edge of the screen in some cases',
            'Fixed cut-off modulation targets in Text Tile window',
        ],
        notes: []
    },
    {
        version: '2.0.0',
        releaseURL: 'https://github.com/spsquared/sound-tile-typescript/releases/tag/v2.0.0',
        headline: 'The Big Rewrite',
        description: `
            <p>
                Sound Tile gets a major facelift, rewriting the <i>entire</i> codebase from scatch (hence the new repository).
                This should improve maintainability and help with adding new features and reducing the number of bugs that slip by.
            </p>
            <p>
                Sound Tile v2.0.0 comes with a new modulation system, a sidebar, new settings, and vastly improved tile settings UI.
                Your old Tiles should be automatically converted to the new format with minimal changes, but <b>backups are recommended</b>.
                Some features from the old version haven't been implemented yet, but should arrive (like picture in picture) soon.
            </p>
            <p>
                <b>New features are already underway!</b> Here's a <s>sneak peek</s> sneek peak: <i>Playlists; a standalone app;
                a BeepBox song visualizer; MIDI visualizer; and video exporting!</i>
            </p>
        `,
        breaking: [
            ['Text size is now proportional to tile height rather than viewport height', [
                'Sound Tile will attempt to convert the text units but this conversion will not always work',
                'Text in legacy layouts may appear large and require changes'
            ]]
        ],
        changes: [
            ['Rewrote entire codebase from scratch in TypeScript and Vue', [
                'No more spaghetti monoliths!',
                'Most tile & visualizer behavior has been preserved, with a few exceptions',
                'Picture-in-picture playback is not implemented yet and has been disabled for now'
            ]],
            ['Removed a few tiles', [
                'Merged the Channel Peaks tile into the Visualizer tile as the "Channel Levels" mode',
                'Removed the Visualizer + Image and Visualizer + Text tiles (see modulation section)',
            ]],
            ['Added a resizeable sidebar with different tabs', [
                '<b>Edit</b> tab replaces the old "Tree mode toggle" and allows editing of layout within it using drag-and-drop, as well as seeing the tree structure',
                '<b>Sources</b> tab allows managing audio source files, consolidating redundant ones to reduce file size & memory usage',
                '<b>Modulation</b> tab allows editing of modulation paths across the layout',
                'Two unimplemented tabs, "Export" and "Playlist", will be completed soon!',
                'Hover over a tile\'s entry in the sidebar to highlight it in the layout, or hover over the "ID" icon in the edit window to highlight it in the sidebar'
            ]],
            ['Added modulation system', [
                'This expands on the old "combined" tile types and allows for arbitrary modulation paths between tiles',
                'Modulations are created via drag-and-drop and can be found under the "modulation" section of tile settings or in the "modulation" tab of the sidebar',
                'Transform functions can be applied to modulations: constant offset, linear, polynomial, exponential, threshold, clamp, and LFO functions are implemented, with more planned',
                'Visualizer + Image and Visualizer + Text tile types were obsoleted by this and have been removed'
            ]],
            'Tiles can now have labels for easier identification',
            ['Organized tile settings', [
                'Tile settings now exist under a toggleable window accessible from a blue "edit" button in the bottom left of the tile, or in the tile\'s sidebar entry',
                'Settings are now grouped under collapsible sections, rather than having a disjointed spaghetti list'
            ]],
            ['Added rich text editing to Text tiles using Trix', [
                'Text styling is no longer tile-wide and can be applied to individual sections of text',
                'Known issues exist with loading text align properties within the editor, like the bee movie script having weird line spacing'
            ]],
            ['Added new Group tile settings', [
                'Added "collapsed" group orientation to allow stacking tiles on top of each other',
                'Added option to change group border colors within the group',
                'Added option to hide group borders within each tile',
                'Border settings affect the borders inside each group, but the root tile controls the outermost borders too'
            ]],
            ['Added more support for gradients across color settings', [
                'Text color now supports gradients',
                'Tile background color now supports gradients',
                'Group border colors also support gradients',
                'Gradients can also have alpha (transparency) effects'
            ]],
            ['Optimized visualizer rendering code slightly', [
                'Also simplified it',
                'Added performance profiling accessible through the keybind <code>CTRL+ALT+\\</code>'
            ]],
            'Removed the "tree mode" toggle as it is now obsolete',
            'Bumped Tile schema version to 2'
        ],
        fixes: [],
        notes: [
            ['Old layouts containing Visualizer + Image, Visualizer + Text, and Channel Peak tiles should automatically be converted', [
                'Use the "collapsed" group type and/or disable group borders, combined with the modulation system, to recreate the "combined" tile type effects',
                'Channel Peaks tile is now the "Channel Levels" mode of the Visualizer tile',
                'Layouts may need some manual tweaking as conversions may not be perfect and the math for the modulations has changed'
            ]],
            'Text from old layouts may look different as the conversion from viewport height to tile height is imperfect',
            [`If there\'s any new bugs, please <a href="${repositoryURL}/issues" target="_blank">create a bug report issue on GitHub</a> or contact me!`, [
                '<span style="font-size: 0.8em;">Please CHECK before posting to avoid duplicate issues!</span>'
            ]]
        ]
    },
    {
        version: '1.0.0',
        headline: 'Legacy',
        releaseURL: 'https://github.com/spsquared/sound-tile',
        description: `
            <p>
                The original Sound Tile didn't have a versioning system, but I'm putting this here anyway.
            </p>
        `,
        breaking: [],
        changes: [],
        fixes: [],
        notes: [
            'Original set of Visualizer, Image, Text, Visualizer + Image, Visualizer + Text, and Channel Peaks tiles',
            'Bar, line, luma, waveform, correlated waveform, and spectrogram modes for visualizer tiles',
            'Playback and seeking with real-time visualizer generation - minimal buffer',
            'Importing and exporting of complete layout files',
            'Metadata for titles, subtitles, and album art'
        ]
    }
];
