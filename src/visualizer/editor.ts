import { reactive } from "vue";
import { AudioLevelsTile, GroupTile, ImageTile, TextTile, Tile, VisualizerTile } from "./tiles";

/**
 * Tile editing system.
 */
export class TileEditor {
    static readonly state = reactive<{
        dropdownOpen: boolean
        sidebarOpen: boolean
        hideTabs: boolean
        sidebarScreenWidth: number
        readonly minSidebarWidthPx: number
        readonly tileTypes: { [key: string]: { Tile: typeof Tile, visible: boolean } }
        treeMode: boolean
        readonly dragging: {
            current: Tile | null
            offset: { x: number, y: number }
        }
    }>({
        dropdownOpen: true,
        sidebarOpen: false,
        hideTabs: false,
        sidebarScreenWidth: 20,
        minSidebarWidthPx: 200,
        tileTypes: {},
        treeMode: false,
        dragging: {
            current: null,
            offset: { x: 0, y: 0 }
        }
    });

    static registerTile(t: typeof Tile, id: string, visible: boolean): void {
        this.state.tileTypes[id] = { Tile: t, visible: visible };
    }

    /**Root node in document - never changes (GroupTile type fixes Vue typing errors) */
    static readonly root: GroupTile = reactive<GroupTile>(new GroupTile()) as GroupTile;
}

export default TileEditor;

// tiles that get displayed in drag-and-drop source
TileEditor.registerTile(GroupTile, 'g', false);
TileEditor.registerTile(VisualizerTile, 'v', true);
TileEditor.registerTile(AudioLevelsTile, 'cp', true); // formerly channel peaks
TileEditor.registerTile(TextTile, 't', true);
TileEditor.registerTile(ImageTile, 'i', true);
TileEditor.registerTile(Tile, 'b', true);

// default state
const defA = new GroupTile();
defA.isVertical = true;
defA.addChild(new VisualizerTile());
const defB = new GroupTile();
defB.addChild(new ImageTile());
defB.addChild(new TextTile());
defA.addChild(defB);
defA.addChild(new VisualizerTile());
TileEditor.root.addChild(defA);
TileEditor.root.addChild(new VisualizerTile());
TileEditor.root.addChild(new VisualizerTile());