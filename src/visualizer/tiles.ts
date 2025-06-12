import { Component, reactive } from "vue";
import EnhancedColorPicker from "@/components/inputs/enhancedColorPicker";
import BaseTileComponent from "./tiles/BaseTile.vue";
import GroupTileComponent from "./tiles/GroupTile.vue";
import VisualizerTileComponent from "./tiles/VisualizerTile.vue";
import AudioLevelsComponent from "./tiles/AudioLevelsTile.vue";
import TextTileComponent from "./tiles/TextTile.vue";
import ImageTileComponent from "./tiles/ImageTile.vue";
import blankTileImg from '@/img/blank-tile.png';
import visualizerTileImg from '@/img/visualizer-tile.png';
import audioLevelsTileImg from '@/img/audiolevels-tile.png';
import textTileImg from '@/img/text-tile.png';
import imageTileImg from '@/img/image-tile.png';

/**
 * Required props for all tile components.
 * Typing isn't super strict, component should have class as type for `tile`.
 */
export type TileComponentProps = {
    tile: Tile
}

/**
 * Blank template superclass for all tiles, defines component and data standardization for all tiles.
 */
export class Tile {
    static readonly component: Component<TileComponentProps> = BaseTileComponent;
    static readonly name: string = 'Blank Tile';
    static readonly image: string = blankTileImg;
    readonly class: typeof Tile = Tile;
    private static idCounter: number = 0;
    /**ID used by Vue v-for */
    readonly id: number;
    /**Ref used in components to open window */
    editPaneOpen: boolean = false;

    /**DOM element, only exists while mounted (set by component) */
    element: HTMLElement | null = null;
    /**Label used to identify tile in editor */
    label: string = Tile.name;
    /**Parent tile (don't modify this manually) */
    parent: GroupTile | null = null;
    /**Relative size compared to sibling tiles (same parent) */
    size: number = 1;
    /**Background color of tile */
    backgroundColor: EnhancedColorPicker;

    constructor() {
        this.id = Tile.idCounter++;
        this.backgroundColor = reactive(new EnhancedColorPicker('#000000')) as EnhancedColorPicker;
    }

    destroy(): void {
        if (this.parent !== null) this.parent.removeChild(this);
    }
}

enum GroupTileOrientation { HORIZONTAL, VERTICAL, COLLAPSED }

/**
 * Tile to create layouts of other tiles in lines - can be nested to create complex arrangements.
 */
export class GroupTile extends Tile {
    static readonly component = GroupTileComponent;
    static readonly name: string = 'Group Tile';
    static readonly image: string = blankTileImg;
    readonly class: typeof GroupTile = GroupTile;

    static readonly HORIZONTAL: GroupTileOrientation = GroupTileOrientation.HORIZONTAL;
    static readonly VERTICAL: GroupTileOrientation = GroupTileOrientation.VERTICAL;
    static readonly COLLAPSED: GroupTileOrientation = GroupTileOrientation.COLLAPSED;

    label: string = GroupTile.name;
    /**Tiles inside (don't modify this manually) */
    readonly children: Tile[] = [];
    /**If children should be laid out vertically (otherwise horizontal) */
    orientation: GroupTileOrientation = GroupTile.HORIZONTAL;
    borderColor: EnhancedColorPicker;

    constructor() {
        super();
        this.borderColor = reactive(new EnhancedColorPicker('#FFFFFF')) as EnhancedColorPicker;
    }

    addChild(tile: Tile): boolean {
        if (this.children.includes(tile)) return false;
        this.children.push(tile);
        tile.parent = this;
        return true;
    }
    insertChildBefore(tile: Tile, current: Tile | number): boolean {
        if (this.children.includes(tile)) return false;
        const index = typeof current == 'number' ? current : this.children.indexOf(current);
        if (index < 0 || index >= this.children.length) return false;
        tile.parent = this;
        this.children.splice(index, 0, tile);
        return true;
    }
    insertChildAfter(tile: Tile, current: Tile | number): boolean {
        if (this.children.includes(tile)) return false;
        const index = typeof current == 'number' ? current : this.children.indexOf(current);
        if (index < 0 || index >= this.children.length) return false;
        tile.parent = this;
        this.children.splice(index + 1, 0, tile);
        return true;
    }
    replaceChild(current: Tile | number, replace: Tile): Tile | null {
        const index = typeof current == 'number' ? current : this.children.indexOf(current);
        if (index < 0 || index >= this.children.length) return null;
        replace.parent = this;
        const old = this.children.splice(index, 1, replace)[0];
        old.parent = null;
        return old;
    }
    removeChild(tile: Tile | number): Tile | null {
        const index = typeof tile == 'number' ? tile : this.children.indexOf(tile);
        if (index < 0 || index >= this.children.length) return null;
        const old = this.children.splice(index, 1)[0];
        old.parent = null;
        this.checkObsolete();
        return old;
    }
    private checkObsolete(): void {
        if (this.parent === null) {
            // special case for root, lower tile then becomes root
            if (this.children.length == 1 && this.children[0] instanceof GroupTile) {
                this.copyProperties(this.children[0]);
                const children = this.children[0].children;
                for (const child of children) child.parent = this;
                this.children.length = 0;
                this.children.push(...children);
                // don't call this.children[0].destroy() as this effectively destroys the tile
                this.checkObsolete();
            }
        } else {
            if (this.children.length == 0) this.destroy();
            else if (this.children.length == 1) {
                const parent = this.parent;
                const child = this.children[0];
                parent.replaceChild(this, child);
                // don't call this.destroy() as this effectively destroys the tile
                parent.checkObsolete();
            }
        }
    }

    /**Convenience function to "inherit" properties from another Group Tile */
    copyProperties(o: GroupTile) {
        this.orientation = o.orientation;
        this.borderColor.colorData = o.borderColor.colorData;
    }

    destroy(): void {
        super.destroy();
        for (const child of this.children) child.destroy();
    }
}

export class VisualizerTile extends Tile {
    static readonly component = VisualizerTileComponent;
    static readonly name: string = 'Visualizer Tile';
    static readonly image: string = visualizerTileImg;
    readonly class: typeof VisualizerTile = VisualizerTile;

    label: string = VisualizerTile.name;

    resize(w: number, h: number): void {

    }
}

export class AudioLevelsTile extends Tile {
    static readonly component = AudioLevelsComponent;
    static readonly name: string = 'Channel Audio Levels Tile';
    static readonly image: string = audioLevelsTileImg;
    readonly class: typeof AudioLevelsTile = AudioLevelsTile;

    label: string = AudioLevelsTile.name;
}

export class TextTile extends Tile {
    static readonly component = TextTileComponent;
    static readonly name: string = 'Text Tile';
    static readonly image: string = textTileImg;
    readonly class: typeof TextTile = TextTile;

    label: string = TextTile.name;
}

export class ImageTile extends Tile {
    static readonly component = ImageTileComponent;
    static readonly name: string = 'Image Tile';
    static readonly image: string = imageTileImg;
    readonly class: typeof ImageTile = ImageTile;

    label: string = ImageTile.name;
}
