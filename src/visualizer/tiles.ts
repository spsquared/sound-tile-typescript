import { Component, nextTick, reactive } from 'vue';
import { cloneDeep, merge } from 'lodash-es';
import { MediaSchema } from './mediaSchema';
import Visualizer from './visualizer';
import { createDefaultVisualizerData, VisualizerData } from './visualizerData';
import Modulation from './modulation';
import ColorPicker from '@/components/inputs/colorPicker';
import TileComponent from './tiles/Tile.vue';
import GroupTileComponent from './tiles/GroupTile.vue';
import VisualizerTileComponent from './tiles/VisualizerTile.vue';
import TextTileComponent from './tiles/TextTile.vue';
import ImageTileComponent from './tiles/ImageTile.vue';
import GrassTileComponent from './tiles/GrassTile.vue';
import blankTileImg from '@/img/blank-tile.png';
import visualizerTileImg from '@/img/visualizer-tile.png';
import textTileImg from '@/img/text-tile.png';
import imageTileImg from '@/img/image-tile.png';

enum GroupTileOrientation { HORIZONTAL, VERTICAL, COLLAPSED }

/**
 * Required props for all tile components.
 * Typing isn't super strict, component should have class as type for `tile`.
 */
type TileComponentProps = {
    tile: Tile
}

/**
 * Blank template superclass for all tiles, defines component and data standardization for all tiles.
 */
export class Tile {
    private static idCounter: number = 0;
    protected static readonly tileTypes: { [key: string]: typeof Tile } = {};
    protected static registerTile(tile: typeof Tile) { this.tileTypes[tile.id] = tile; }

    static readonly id: string = 'b';
    static readonly component: Component<TileComponentProps> = TileComponent;
    static readonly name: string = 'Blank Tile';
    static readonly image: string = blankTileImg;
    readonly class: typeof Tile = Tile;
    static { this.registerTile(this); }

    readonly mountedListeners: Set<() => any> = new Set();
    readonly unmountedListeners: Set<() => any> = new Set();

    /**ID used by Vue indexing */
    readonly id: number;
    /**Ref used in components to open window */
    editWindowOpen: boolean = false;

    /**DOM element, only exists while mounted (set by component) */
    element: HTMLElement | null = null;
    /**DOM elements in sidebar (handle and children container), only exists while mounted (set by sidebar component) */
    sidebarElements: { handle: HTMLElement, children: HTMLElement | null } | null = null;
    /**Label used to identify tile in editor */
    label: string = Tile.name;
    /**Parent tile (don't modify this manually) */
    parent: GroupTile | null = null;
    /**Relative size compared to sibling tiles (same parent) */
    size: number = 1;
    /**Background color of tile */
    backgroundColor: ColorPicker;

    constructor() {
        this.id = Tile.idCounter++;
        this.backgroundColor = new ColorPicker('#000000');
    }

    /**Dehydrate a tile to its data */
    getSchemaData(): MediaSchema.Tile {
        return cloneDeep({
            type: this.class.id,
            label: this.label,
            size: this.size,
            backgroundColor: this.backgroundColor.colorData
        });
    }
    /**Reconstitute a tile from its data */
    static fromSchemaData(data: MediaSchema.Tile): Tile {
        return this.reconstitute(data, new Tile());
    }
    protected static reconstitute(data: MediaSchema.Tile, tile: Tile): Tile {
        tile.label = data.label;
        tile.size = data.size;
        tile.backgroundColor.colorData = data.backgroundColor;
        return tile;
    }

    /**Deletes the tile and disposes of all resources */
    destroy(): void {
        this.parent?.removeChild(this);
    }
}

/**
 * Tile to create layouts of other tiles in lines - can be nested to create complex arrangements.
 */
export class GroupTile extends Tile {
    static readonly id: string = 'g';
    static readonly component = GroupTileComponent;
    static readonly name: string = 'Group Tile';
    static readonly image: string = blankTileImg;
    readonly class: typeof GroupTile = GroupTile;
    static { this.registerTile(this); }

    static readonly HORIZONTAL: GroupTileOrientation = GroupTileOrientation.HORIZONTAL;
    static readonly VERTICAL: GroupTileOrientation = GroupTileOrientation.VERTICAL;
    static readonly COLLAPSED: GroupTileOrientation = GroupTileOrientation.COLLAPSED;

    label: string = GroupTile.name;
    /**Tiles inside (don't modify this manually) */
    readonly children: Tile[] = [];
    /**If children should be laid out vertically (otherwise horizontal) */
    orientation: GroupTileOrientation = GroupTile.HORIZONTAL;
    /**Border color of tile - has no effect on collapsed groups and groups with hidden borders */
    borderColor: ColorPicker;
    /**Disables internal borders and border gaps between tiles completely - no effect on collapsed groups */
    hideBorders: boolean = false;

    constructor() {
        super();
        this.borderColor = new ColorPicker('#FFFFFF');
    }

    addChild(tile: Tile): boolean {
        if (tile.parent !== null) return false;
        this.children.push(tile);
        tile.parent = this;
        return true;
    }
    insertChildBefore(tile: Tile, current: Tile | number): boolean {
        if (tile.parent !== null) return false;
        const index = typeof current == 'number' ? current : this.children.findIndex((t) => t.id == current.id);
        if (index < 0 || index >= this.children.length) return false;
        tile.parent = this;
        this.children.splice(index, 0, tile);
        return true;
    }
    insertChildAfter(tile: Tile, current: Tile | number): boolean {
        if (tile.parent !== null) return false;
        const index = typeof current == 'number' ? current : this.children.findIndex((t) => t.id == current.id);
        if (index < 0 || index >= this.children.length) return false;
        tile.parent = this;
        this.children.splice(index + 1, 0, tile);
        return true;
    }
    replaceChild(current: Tile | number, replace: Tile): Tile | null {
        if (replace.parent !== null) return null;
        const index = typeof current == 'number' ? current : this.children.findIndex((t) => t.id == current.id);
        if (index < 0 || index >= this.children.length) return null;
        replace.parent = this;
        const old = this.children.splice(index, 1, replace)[0];
        old.parent = null;
        return old;
    }
    removeChild(tile: Tile | number): Tile | null {
        const index = typeof tile == 'number' ? tile : this.children.findIndex((t) => t.id == tile.id);
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
                const children = this.children[0].children;
                for (const child of children) child.parent = this;
                this.children.length = 0;
                this.children.push(...children);
                // don't call this.children[0].destroy() as this destroys the child too
                this.checkObsolete();
            }
        } else {
            if (this.children.length == 0) this.destroy();
            else if (this.children.length == 1) {
                const parent = this.parent;
                const child = this.children[0];
                child.parent = null;
                parent.replaceChild(this, child);
                // don't call this.destroy() as this destroys the child too
                parent.checkObsolete();
            }
        }
    }

    /**Convenience function to "inherit" properties from another Group Tile */
    copyProperties(o: GroupTile) {
        this.orientation = o.orientation;
        this.borderColor.colorData = o.borderColor.colorData;
        this.backgroundColor.colorData = o.backgroundColor.colorData;
        this.hideBorders = o.hideBorders;
    }

    getSchemaData(): MediaSchema.GroupTile {
        return {
            ...super.getSchemaData(),
            ...cloneDeep<Omit<MediaSchema.GroupTile, keyof MediaSchema.Tile>>({
                orientation: this.orientation,
                borderColor: this.borderColor.colorData,
                children: this.children.map((c) => c.getSchemaData())
            })
        } as MediaSchema.GroupTile;
    }
    static fromSchemaData(data: MediaSchema.GroupTile): GroupTile {
        return this.reconstitute(data, new GroupTile());
    }
    protected static reconstitute(data: MediaSchema.GroupTile, tile: GroupTile): GroupTile {
        super.reconstitute(data, tile);
        tile.orientation = data.orientation;
        tile.borderColor.colorData = data.borderColor;
        tile.children.push(...data.children.map<Tile>((childData) => {
            const TileConstructor = Tile.tileTypes[childData.type];
            if (TileConstructor === undefined) {
                const text = new TextTile();
                Tile.reconstitute(childData, text);
                text.text = `<align-center><span style="font-size: 6em;">Unknown Tile</span></align-center>`;
                text.textColor.colorData = {
                    type: 'solid',
                    color: '#FF0000',
                    alpha: 1
                };
                text.parent = tile;
                return text;
            }
            const child = TileConstructor.fromSchemaData(childData);
            child.parent = tile;
            return child;
        }));
        return tile;
    }

    destroy(): void {
        super.destroy();
        for (const child of this.children) child.destroy();
    }
}

export class VisualizerTile extends Tile {
    static readonly id: string = 'v';
    static readonly component = VisualizerTileComponent;
    static readonly name: string = 'Visualizer Tile';
    static readonly image: string = visualizerTileImg;
    readonly class: typeof VisualizerTile = VisualizerTile;
    static { this.registerTile(this); }

    label: string = VisualizerTile.name;

    readonly modulator: Modulation.Source<{
        peak: () => number
    }>;

    /**Canvas element maintained by tile instance, as component mount-unmount would create and destroy it */
    readonly canvas: HTMLCanvasElement;
    /**Visualizer instance attached */
    readonly visualizer: Visualizer;

    constructor(data?: VisualizerData) {
        super();
        this.canvas = document.createElement('canvas');
        this.visualizer = new Visualizer(data ?? createDefaultVisualizerData(), this.canvas);
        // when dragging/moving tiles, unmount happens immediately and remount happens 1 tick later
        // nextTick stops visualizer "glitching" (sounds & behavior) when drag & drop used
        this.mountedListeners.add(() => this.visualizer.visible.value = true);
        this.unmountedListeners.add(async () => {
            await nextTick();
            if (this.element === null) this.visualizer.visible.value = false;
        });
        this.modulator = new Modulation.Source({
            peak: () => this.visualizer.renderer.frameResult.value.approximatePeak
        }, {
            tile: this
        }); // overhead? should only track label
    }

    getSchemaData(): MediaSchema.VisualizerTile {
        return {
            ...super.getSchemaData(),
            ...cloneDeep<Omit<MediaSchema.VisualizerTile, keyof MediaSchema.Tile>>({
                data: this.visualizer.data
            })
        } as MediaSchema.VisualizerTile;
    }
    static fromSchemaData(data: MediaSchema.VisualizerTile): VisualizerTile {
        // visualizer data can't be set after creation so it has to be done here
        return this.reconstitute(data, new VisualizerTile(merge(createDefaultVisualizerData(), data.data)));
    }
    protected static reconstitute(data: MediaSchema.VisualizerTile, tile: VisualizerTile): VisualizerTile {
        super.reconstitute(data, tile);
        // scuffed patch for label reactivity
        reactive(tile).label = tile.label;
        // if for some reason some tile extends VisualizerTile it'll have to apply visualizer data on its own
        return tile;
    }

    destroy(): void {
        super.destroy();
        this.visualizer.destroy();
        this.modulator.destroy();
    }
}

export class TextTile extends Tile {
    static readonly id: string = 't';
    static readonly component = TextTileComponent;
    static readonly name: string = 'Text Tile';
    static readonly image: string = textTileImg;
    readonly class: typeof TextTile = TextTile;
    static { this.registerTile(this); }

    label: string = TextTile.name;

    /**Text HTML of tile */
    text: string = '<align-center><span style="font-size: 2em;">Text Here</span></align-align-center>';
    /**Color of text */
    textColor: ColorPicker;
    /**Alignment of text block along block axis - inline axis is determined by text itself */
    align: 'start' | 'center' | 'end' = 'center';

    constructor() {
        super();
        this.textColor = new ColorPicker('#FFFFFF');
    }

    getSchemaData(): MediaSchema.TextTile {
        return {
            ...super.getSchemaData(),
            ...cloneDeep<Omit<MediaSchema.TextTile, keyof MediaSchema.Tile>>({
                textHtml: this.text,
                textColor: this.textColor.colorData,
                align: this.align
            })
        } as MediaSchema.TextTile;
    }
    static fromSchemaData(data: MediaSchema.TextTile): TextTile {
        return this.reconstitute(data, new TextTile());
    }
    protected static reconstitute(data: MediaSchema.TextTile, tile: TextTile): TextTile {
        super.reconstitute(data, tile);
        tile.text = data.textHtml;
        tile.textColor.colorData = data.textColor;
        tile.align = data.align;
        return tile;
    }
}

export class ImageTile extends Tile implements Modulation.Modulatable<{
    imgScale: number
    imgOffsetX: number
    imgOffsetY: number
    imgRotation: number
}> {
    static readonly id: string = 'i';
    static readonly component = ImageTileComponent;
    static readonly name: string = 'Image Tile';
    static readonly image: string = imageTileImg;
    readonly class: typeof ImageTile = ImageTile;
    static { this.registerTile(this); }

    label: string = ImageTile.name;

    readonly modulation = new Modulation.Target({
        imgScale: 1,
        imgOffsetX: 0,
        imgOffsetY: 0,
        imgRotation: 0
    }, {
        tile: this
    });

    /**Image source, (hopefully) as a data: URL */
    imgSrc: string = '';
    /**Smooth drawing */
    smoothDrawing: boolean = true;
    /**Position the image center in percentage coordinates of tile boundaries & rotate/scale the image */
    position: { x: number, y: number, rotation: number, scale: number } = { x: 50, y: 50, rotation: 0, scale: 1 };

    constructor() {
        super();
    }

    getSchemaData(): MediaSchema.ImageTile {
        return {
            ...super.getSchemaData(),
            ...cloneDeep<Omit<MediaSchema.ImageTile, keyof MediaSchema.Tile>>({
                imgSrc: this.imgSrc,
                smoothDrawing: this.smoothDrawing
            })
        } as MediaSchema.ImageTile;
    }
    static fromSchemaData(data: MediaSchema.ImageTile): ImageTile {
        return this.reconstitute(data, new ImageTile());
    }
    protected static reconstitute(data: MediaSchema.ImageTile, tile: ImageTile): ImageTile {
        super.reconstitute(data, tile);
        tile.imgSrc = data.imgSrc;
        tile.smoothDrawing = data.smoothDrawing;
        return tile;
    }

    destroy(): void {
        super.destroy();
        this.modulation.destroy();
    }
}

export class GrassTile extends Tile {
    static readonly id: string = 'grass';
    static readonly component = GrassTileComponent;
    static readonly name: string = 'Grass Tile';
    static readonly image: string = blankTileImg;
    readonly class: typeof GrassTile = GrassTile;
    static { this.registerTile(this); }

    label: string = GrassTile.name;

    getSchemaData(): MediaSchema.GrassTile {
        return {
            ...super.getSchemaData(),
            ...cloneDeep<Omit<MediaSchema.GrassTile, keyof MediaSchema.Tile>>({
            })
        } as MediaSchema.GrassTile;
    }
    static fromSchemaData(data: MediaSchema.GrassTile): GrassTile {
        return this.reconstitute(data, new GrassTile());
    }
    protected static reconstitute(data: MediaSchema.GrassTile, tile: GrassTile): GrassTile {
        super.reconstitute(data, tile);
        return tile;
    }
}