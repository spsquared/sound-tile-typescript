import { Component } from "vue";
import TileEditor from "./editor";
import BaseTileComponent from "./tiles/BaseTile.vue";
import GroupTileComponent from "./tiles/GroupTile.vue";
import ImageTileComponent from "./tiles/ImageTile.vue";

/**
 * Required props for all tile components.
 * Typing isn't super strict, component should have class as type for `tile`.
 */
export type TileComponentProps = {
    tile: Tile
}

/**
 * Tile superclass for all tiles, defines component and data standardization for all tiles.
 */
export abstract class Tile {
    static readonly component: Component<TileComponentProps> = BaseTileComponent;

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

    children: Tile[] = [];

    constructor(parent: GroupTile | null) {
        super(parent);
    }

    delete(): void {
        // override normal tile delete function
    }
}

export class ImageTile extends Tile {
    static readonly component = ImageTileComponent;
}

TileEditor.registerTile(GroupTile);
TileEditor.registerTile(ImageTile);