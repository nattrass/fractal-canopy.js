export type RandomFn = () => number;

// xmur3: hashes a string into a 32-bit seed generator. Calling the returned
// function advances and returns a new 32-bit unsigned int each time, which is
// exactly the seed mulberry32 wants.
export function xmur3(str: string): () => number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function (): number {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
    };
}

// mulberry32: a small, fast PRNG seeded with a 32-bit int. Returns a function
// that yields successive pseudo-random numbers in [0, 1), deterministic for a
// given seed.
export function mulberry32(seed: number): RandomFn {
    let a = seed | 0;
    return function (): number {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Builds a deterministic RandomFn from a CanopyOptions seed. String seeds are
// hashed to a 32-bit int via xmur3 first; numeric seeds feed mulberry32
// directly (truncated to a 32-bit int, same as mulberry32 does internally).
export function createRandom(seed: string | number): RandomFn {
    const seedInt = typeof seed === 'string' ? xmur3(seed)() : seed;
    return mulberry32(seedInt);
}
