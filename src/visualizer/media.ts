const msgpack = import('@msgpack/msgpack');
const fflate = import('fflate');
import { printStackTrace } from '@/components/scripts/debug';
import { soundtileMsgpackExtensions } from '@/components/scripts/msgpackExtensions';
import { MediaSchema } from './mediaSchema';
import { GrassTile, GroupTile, ImageTile, TextTile, Tile, VisualizerTile } from './tiles';
import { Modulation } from './modulation';

export const defaultCoverArt = 'data:image/png;base64,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';
const webWorkerSupported = 'Worker' in window;

/**
 * Track information for a Sound Tile track, with no audio data.
 */
export interface MediaMetadata {
    title: string;
    subtitle: string;
    coverArt: string;
}

/**
 * A single Sound Tile track.
 */
export class Media implements MediaMetadata {
    title: string = '';
    subtitle: string = '';
    coverArt: string = '';
    tree: GroupTile;

    constructor(data: MediaMetadata, root?: GroupTile) {
        for (const key in data) {
            (this as any)[key] = (data as any)[key];
        }
        this.tree = root ?? new GroupTile();
    }

    /**
     * Deflate the Media into a compressed Tile layout.
     * @param consume Ignores data preservation and renders audio buffers unusable after compression
     * @returns Compressed Tile layout, or `null` if an error occured in encoding
     * (buffers may still be destroyed if `consume` is true!)
     */
    async compress(consume: boolean = false): Promise<ArrayBuffer | null> {
        const encodeMsgpack = (await msgpack).encode;
        const { gzip, gzipSync } = await fflate;
        try {
            // conversion recursion actually happens in the tile code
            const root: MediaSchema.GroupTile = this.tree.getSchemaData();
            // move all visualizer sources to reference array, same source buffer will reference same position
            const sources: ArrayBuffer[] = [];
            const stack: MediaSchema.Tile[] = [root];
            while (stack.length > 0) {
                const curr = stack.pop()!;
                if (curr.type == GroupTile.id) {
                    stack.push(...(curr as MediaSchema.GroupTile).children);
                } else if (curr.type == VisualizerTile.id) {
                    const v = (curr as MediaSchema.VisualizerTile).data;
                    if (typeof v.buffer == 'number' || v.buffer === null) continue; // shouldn't be number
                    const index = sources.indexOf(v.buffer);
                    if (index == -1) {
                        sources.push(v.buffer);
                        v.buffer = sources.length - 1;
                    } else {
                        v.buffer = index;
                    }
                }
            }
            // compress all sources
            await Promise.all(sources.map(async (buffer, i) => {
                if (webWorkerSupported) {
                    await new Promise<void>((resolve, reject) => {
                        gzip(new Uint8Array(buffer), { consume: consume, level: 4 }, (err, data) => {
                            if (err) reject(err);
                            else {
                                sources[i] = data.slice().buffer;
                                resolve();
                            }
                        });
                    });
                } else {
                    sources[i] = gzipSync(new Uint8Array(buffer), { level: 4 }).slice().buffer;
                }
            }));
            // msgpack it
            const data: MediaSchema.SchemaV2 = {
                version: 2,
                metadata: {
                    title: this.title,
                    subtitle: this.subtitle,
                    coverArt: this.coverArt
                },
                sources: sources,
                tree: root
            };
            return encodeMsgpack(data, { extensionCodec: soundtileMsgpackExtensions }).slice().buffer;
        } catch (err) {
            console.error('Failed to compress media');
            console.error(err);
            printStackTrace();
            return null;
        }
    }

    /**
     * Inflate a compressed Tile layout to a Media instance.
     * @param file Compressed file data
     * @returns Media instance, or `null` if an error occured in decoding
     */
    static async decompress(file: ArrayBuffer | File): Promise<Media | null> {
        const decodeMsgpackAsync = (await msgpack).decodeAsync;
        try {
            // if the data is invalid then it'll probably crash and then we return null
            const stream = file instanceof File ? file.stream() : new ReadableStream(new Blob([new Uint8Array(file)]).stream());
            const data: MediaSchema.Schema = await decodeMsgpackAsync(stream, { extensionCodec: soundtileMsgpackExtensions }) as any;
            const methods = [this.decompressV0, this.decompressV1, this.decompressV2] as ((data: MediaSchema.Schema) => Promise<Media | null>)[];
            return await methods[data.version]?.call(this, data) ?? null;
        } catch (err) {
            console.error('Failed to decompress media');
            console.error(err);
            printStackTrace();
            return null;
        }
    }

    private static async decompressV0(data: MediaSchema.SchemaV0): Promise<Media | null> {
        const metaroot = new GroupTile(); // not actually the root
        // tuple of tree node and parent tile - use queue to preserve ordering of children
        const queue: [MediaSchema.LegacyTree, GroupTile][] = [[data.root, metaroot]];
        while (queue.length > 0) {
            const [curr, parent] = queue.shift()!;
            if ('children' in curr) {
                const tile = new GroupTile();
                tile.orientation = curr.orientation ? GroupTile.VERTICAL : GroupTile.HORIZONTAL;
                tile.size = curr.flex ?? curr.flexGrow ?? 1;
                parent.addChild(tile);
                queue.push(...curr.children.map<[MediaSchema.LegacyTree, GroupTile]>((v) => [v, tile]));
            } else {
                // default is "unknown tile" error tile
                let tile: Tile = new TextTile();
                switch (curr.type) {
                    case 'v': {
                        const visualizer = new VisualizerTile(curr.visualizer !== null ? MediaSchema.translateLegacyVisualizerData(curr.visualizer) : undefined);
                        tile = visualizer;
                        break;
                    }
                    case 'vi': {
                        const group = new GroupTile();
                        group.label = 'Visualizer Image Tile (converted)';
                        group.orientation = curr.imageBackground ? GroupTile.COLLAPSED : GroupTile.VERTICAL;
                        group.hideBorders = true;
                        const visualizer = new VisualizerTile(curr.visualizer !== null ? MediaSchema.translateLegacyVisualizerData(curr.visualizer) : undefined);
                        visualizer.backgroundColor.colorData = MediaSchema.translateLegacyColorData(curr.backgroundColor);
                        const image = new ImageTile();
                        image.backgroundColor.colorData = visualizer.backgroundColor.colorData;
                        image.imgSrc = curr.image ?? '';
                        image.smoothDrawing = curr.smoothing ?? true;
                        if (curr.imageReactive) {
                            visualizer.visualizer.modulator.connect(image.modulation, 'peak', 'imgScale', [
                                new Modulation.LinearTransform([(curr.imageReactiveMax ?? 1) - (curr.imageReactiveMin ?? 0), curr.imageReactiveMin ?? 0])
                            ]);
                        }
                        if (curr.imageBackground) {
                            // image under the visualizer
                            group.addChild(image);
                            group.addChild(visualizer);
                        } else {
                            group.addChild(visualizer);
                            group.addChild(image);
                        }
                        tile = group;
                        break;
                    }
                    case 'vt': {
                        const group = new GroupTile();
                        group.label = 'Visualizer Text Tile (converted)';
                        group.orientation = GroupTile.VERTICAL;
                        group.hideBorders = true;
                        const visualizer = new VisualizerTile(curr.visualizer !== null ? MediaSchema.translateLegacyVisualizerData(curr.visualizer) : undefined);
                        visualizer.backgroundColor.colorData = MediaSchema.translateLegacyColorData(curr.backgroundColor);
                        const text = new TextTile();
                        // legacy font size is relative to viewport height, not tile height, so the conversion is sort of arbitrary
                        const textAlign = curr.textAlign == 1 ? 'right' : curr.textAlign == 0.5 ? 'center' : 'left';
                        // font size here is just fitting the number of lines to the tile (bee movie script will not enjoy this)
                        const lineCount = curr.text.split('\n').length;
                        text.text = `<align-${textAlign}><span style="font-size: ${6 / lineCount}em;">${curr.text.replace('\n', '<br>')}</span></align-${textAlign}>`;
                        text.backgroundColor.colorData = visualizer.backgroundColor.colorData;
                        text.textColor.colorData = {
                            type: 'solid',
                            color: curr.textColor,
                            alpha: 1
                        };
                        text.align = 'center';
                        // increase size of visualizer instead of decreasing text since smallest valid input value is 1
                        visualizer.size = Math.ceil(60 / (lineCount * curr.fontSize));
                        group.addChild(visualizer);
                        group.addChild(text);
                        tile = group;
                        break;
                    }
                    case 'cp': {
                        const visualizer = new VisualizerTile(curr.visualizer !== null ? MediaSchema.translateLegacyVisualizerData(curr.visualizer) : undefined);
                        visualizer.label = 'Channel Peaks Tile';
                        tile = visualizer;
                        break;
                    }
                    case 'i': {
                        const image = new ImageTile();
                        image.imgSrc = curr.image ?? '';
                        image.smoothDrawing = curr.smoothing ?? true;
                        tile = image;
                        break;
                    }
                    case 't': {
                        const text = new TextTile();
                        // why is text align a number????
                        const textAlign = curr.textAlign == 1 ? 'right' : curr.textAlign == 0.5 ? 'center' : 'left';
                        // fit lines to tile, sort of have to throw out the old font size since conversion would be dependent on window size
                        const lineCount = curr.text.split('\n').length;
                        text.text = `<align-${textAlign}><span style="font-size: ${6 / lineCount}em;">${curr.text.replace('\n', '<br>')}</span></align-${textAlign}>`;
                        text.textColor.colorData = {
                            type: 'solid',
                            color: curr.color,
                            alpha: 1
                        };
                        text.align = 'center';
                        tile = text;
                        break;
                    }
                    case 'b': {
                        tile = new Tile();
                        break;
                    }
                    case 'grass': {
                        tile = new GrassTile();
                        break;
                    }
                }
                tile.backgroundColor.colorData = MediaSchema.translateLegacyColorData(curr.backgroundColor);
                tile.size = curr.flex ?? 1;
                parent.addChild(tile);
            }
        }
        const root = metaroot.children[0] as GroupTile;
        root.label = 'Root Group Tile';
        return new Media({
            title: '',
            subtitle: '',
            coverArt: defaultCoverArt
        }, root);
    }
    private static async decompressV1(data: MediaSchema.SchemaV1): Promise<Media | null> {
        const { root, metadata } = data;
        const { decompress, decompressSync } = await fflate;
        // mirroring legacy code, decompress all buffers and then run v0 decompression
        const stack: MediaSchema.LegacyTree[] = [root];
        const promises: Promise<any>[] = [];
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if ('children' in curr) {
                stack.push(...curr.children);
            } else if ('visualizer' in curr && curr.visualizer !== null) {
                const v = curr.visualizer;
                if (webWorkerSupported) {
                    promises.push(new Promise<void>((resolve, reject) => {
                        decompress(new Uint8Array(v.buffer), { consume: true }, (err, data) => {
                            if (err) reject(err);
                            else {
                                v.buffer = data.slice().buffer;
                                resolve();
                            }
                        });
                    }));
                } else {
                    v.buffer = decompressSync(new Uint8Array(v.buffer)).slice().buffer;
                }
            }
        }
        await Promise.all(promises);
        const media = await this.decompressV0({ version: 0, root: root });
        if (media === null) return null;
        media.title = metadata.title;
        media.subtitle = metadata.subtitle;
        media.coverArt = metadata.image;
        return media;
    }
    private static async decompressV2(data: MediaSchema.SchemaV2): Promise<Media | null> {
        const { sources, tree, metadata } = data;
        const { decompress, decompressSync } = await fflate;
        // decompress all sources first
        await Promise.all(sources.map(async (buffer, i) => {
            if (webWorkerSupported) {
                await new Promise<void>((resolve, reject) => {
                    decompress(new Uint8Array(buffer), { consume: true }, (err, data) => {
                        if (err) reject(err);
                        else {
                            sources[i] = data.slice().buffer;
                            resolve();
                        }
                    });
                });
            } else {
                sources[i] = decompressSync(new Uint8Array(buffer)).slice().buffer;
            }
        }));
        // re-attach the sources of the visualizers
        const stack: MediaSchema.Tile[] = [tree];
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (curr.type == GroupTile.id) {
                stack.push(...(curr as MediaSchema.GroupTile).children);
            } else if (curr.type == VisualizerTile.id) {
                const v = (curr as MediaSchema.VisualizerTile).data;
                if (v.buffer instanceof ArrayBuffer || v.buffer === null) continue; // shouldn't be buffer
                v.buffer = sources[v.buffer] ?? null;
                if (v.buffer === null) console.warn('Visualizer buffer resolution failed');
            }
        }
        // tree reconstitution happens in tile code rather than here
        const root = GroupTile.fromSchemaData(tree);
        // media
        return new Media(metadata, root);
    }
}
