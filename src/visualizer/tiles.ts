import { Component } from "vue";
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

    parent: GroupTile | null;

    constructor(parent: GroupTile | null) {
        this.parent = parent;
    }

    delete(): void {
        // remove, parent checks if unnecessary
    }
}

export class GroupTile extends Tile {
    static readonly component: Component<TileComponentProps> = GroupTileComponent;
    static readonly name: string = 'Group Tile';
    static readonly image: string = blankTileImg;

    children: Tile[] = [];

    constructor(parent: GroupTile | null) {
        super(parent);
    }

    delete(): void {
        // override normal tile delete function
    }
}

export class VisualizerTile extends Tile {
    static readonly component = VisualizerTileComponent;
    static readonly name: string = 'Visualizer Tile';
    static readonly image: string = visualizerTileImg;
}

export class AudioLevelsTile extends Tile {
    static readonly component = AudioLevelsComponent;
    static readonly name: string = 'Channel Audio Levels Tile';
    static readonly image: string = audioLevelsTileImg;
}

export class TextTile extends Tile {
    static readonly component = TextTileComponent;
    static readonly name: string = 'Text Tile';
    static readonly image: string = textTileImg;
}

export class ImageTile extends Tile {
    static readonly component = ImageTileComponent;
    static readonly name: string = 'Image Tile';
    static readonly image: string = imageTileImg;
}
