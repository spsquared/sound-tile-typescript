import defaultCoverArtImg from '@/img/default-cover.png';

export const defaultCoverArt = defaultCoverArtImg;

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
    
    constructor(dat: MediaMetadata) {
        for (const key in dat) {
            (this as any)[key] = (dat as any)[key];
        }
    }

    compress(): CompressedMediaFile {
        return new CompressedMediaFile(new Uint8Array(0).buffer);
    }
}

/**
 * Compressed version of a Sound Tile track for filesystem storage.
 */
export class CompressedMediaFile {
    file: ArrayBuffer; // if tauri native api is available a way to fetch from disk should be here too

    constructor(source: ArrayBuffer) {
        this.file = source;
    }

    decompress(): Media {
        return new Media({
            title: '',
            subtitle: '',
            coverArt: ''
        });
    }
}