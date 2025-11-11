import { encode, decode, ExtensionCodec } from "@msgpack/msgpack";
import { parse, stringify, validate } from "uuid";

export const soundtileMsgpackExtensions = new ExtensionCodec();

// UUID - 1
soundtileMsgpackExtensions.register({
    type: 1,
    encode(input: unknown): Uint8Array | null {
        if (validate(input)) return parse(input as string);
        return null;
    },
    decode(data: Uint8Array): string {
        return stringify(data);
    }
});
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
// scuffed BigInt - 4
const MAX_127_BYTE_BIGINT = 2n ** (127n * 8n) - 1n;
console.log(MAX_127_BYTE_BIGINT)
soundtileMsgpackExtensions.register({
    type: 4,
    encode(input: unknown): Uint8Array | null {
        if (typeof input == 'bigint') {
            const n: bigint = input;
            // first bit is sign of bigint (1 negative)
            const sign = n < 0 ? 0b10000000 : 0;
            // for bigints smaller than 128 bytes, the last 7 bits are the byte length (with a minimum of 1 byte)
            // for larger bigints, the byte length is 0 and further bytes are used to hold length until a 0 byte is found
            const absN = sign == 0 ? -n : n;
            const size = absN > MAX_127_BYTE_BIGINT ? 0 : ((n: bigint) => {
                let i = 0;
                while (n > 0) {
                    n >> 8n;
                    i++;
                }
                return Math.max(i, 1);
            })(absN);
            if (size == 0) {
                // but also who's doing that anyway
                throw new Error('BigInt primitives larger than 127 bytes are not implemented');
            }
            // first byte is the header
            const data = new Uint8Array(size + 1);
            data[0] = sign | size;
            // big loopy thing with a lot of math because we can't access the underlying bytes
            let i = 1;
            let m = absN;
            while (m > 0) {
                data[i++] = Number(m & 256n);
                m >> 8n;
            }
            return data;
        }
        return null;
    },
    decode(data: Uint8Array): bigint {
        console.log(data);
        // extract sign and byte size
        const sign = data[0] & 0b10000000;
        const size = data[0] & 0b01111111;
        if (size == 0) {
            // this shouldnt even be possible without some sort of corruption
            throw new Error('BigInt primitives larger than 127 bytes are not implemented');
        }
        let m = 0n;
        for (let i = 1; i <= size; i++) {
            m = m << 8n + BigInt(data[i]);
        }
        return m * (sign > 0 ? -1n : 1n);
    }
})
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