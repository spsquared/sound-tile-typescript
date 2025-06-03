import { reactive } from "vue";
import { AudioLevelsTile, GroupTile, ImageTile, TextTile, Tile, VisualizerTile } from "./tiles";

/**
 * Tile editing system.
 */
export class TileEditor {
    static readonly state = reactive<{
        /**List of all tile types that can be created */
        readonly tileTypes: (typeof Tile)[]
        treeMode: boolean
        readonly dragging: {
            current: Tile | null
        }
    }>({
        tileTypes: [],
        treeMode: false,
        dragging: {
            current: null
        }
    });

    static registerTile(t: typeof Tile): void {
        this.state.tileTypes.push(t);
    }

    /**Root node in document - never changes (GroupTile type fixes Vue typing errors) */
    static readonly root: GroupTile = reactive<GroupTile>(new GroupTile()) as GroupTile;
}

export default TileEditor;

// tiles that get displayed in drag-and-drop source
TileEditor.registerTile(VisualizerTile);
TileEditor.registerTile(AudioLevelsTile);
TileEditor.registerTile(TextTile);
TileEditor.registerTile(ImageTile);
TileEditor.registerTile(Tile);

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