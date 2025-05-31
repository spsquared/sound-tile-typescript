import { reactive } from "vue";
import { Tile } from "./tiles";

/**
 * Tile editing system.
 */
export class TileEditor {
    /**List of all tile classes that can be used */
    private static readonly tileTypes: (typeof Tile)[];

    static registerTile(t: typeof Tile): void {
        this.tileTypes.push(t);
    }

    static readonly state = reactive<{
        treeMode: boolean
    }>({
        treeMode: false
    });
}

export default TileEditor;