import { GroupTile } from './tiles';

export const defaultCoverArt = 'data:image/png;base64,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';

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

    async compress(): Promise<ArrayBuffer | null> {
        return null;
    }
}