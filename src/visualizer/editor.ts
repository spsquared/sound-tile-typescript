import { reactive } from "vue";
import { AudioLevelsTile, ImageTile, TextTile, Tile, VisualizerTile } from "./tiles";

/**
 * Tile editing system.
 */
export class TileEditor {
    static readonly state = reactive<{
        /**List of all tile types that can be created */
        readonly tileTypes: (typeof Tile)[]
        treeMode: boolean
    }>({
        tileTypes: [],
        treeMode: false
    });

    static registerTile(t: typeof Tile): void {
        this.state.tileTypes.push(t);
        console.log('oof')
    }
}

export default TileEditor;

TileEditor.registerTile(VisualizerTile);
TileEditor.registerTile(AudioLevelsTile);
TileEditor.registerTile(TextTile);
TileEditor.registerTile(ImageTile);
TileEditor.registerTile(Tile);