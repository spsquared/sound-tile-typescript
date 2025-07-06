import { encode, decode, ExtensionCodec } from "@msgpack/msgpack";

export const soundtileMsgpackExtensions = new ExtensionCodec();

// 1 is usually uuid

// Set - 2
soundtileMsgpackExtensions.register({
    type: 2,
    encode(input: unknown): Uint8Array | null {
        if (input instanceof Set) return encode([...input.values()], { extensionCodec: soundtileMsgpackExtensions });
        return null;
    },
    decode(data: Uint8Array): Set<unknown> {
        return new Set<unknown>(decode(data, { extensionCodec: soundtileMsgpackExtensions }) as unknown[]);
    }
});
// Map - 3
soundtileMsgpackExtensions.register({
    type: 3,
    encode(input: unknown): Uint8Array | null {
        if (input instanceof Map) return encode([...input.entries()], { extensionCodec: soundtileMsgpackExtensions });
        return null;
    },
    decode(data: Uint8Array): Map<unknown, unknown> {
        return new Map<unknown, unknown>(decode(data, { extensionCodec: soundtileMsgpackExtensions }) as [unknown, unknown][]);
    }
});
// ArrayBuffer - 26 (locked due to legacy Sound Tile using a package that had ArrayBuffer as extension 26)
soundtileMsgpackExtensions.register({
    type: 26,
    encode(input: unknown): Uint8Array | null {
        if (input instanceof ArrayBuffer) return new Uint8Array(input);
        return null;
    },
    decode(data: Uint8Array): ArrayBuffer {
        // slice prevents data from outside the data view from ending up in decoded buffer
        return data.slice().buffer;
    }
});