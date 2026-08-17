import { describe, it, expect } from 'vitest';
import { xmur3, mulberry32, createRandom } from '../src/random';

describe('xmur3', () => {
    it('should hash the same string to the same value every time', () => {
        expect(xmur3('acorn')()).toBe(xmur3('acorn')());
    });

    it('should hash different strings to different values', () => {
        expect(xmur3('acorn')()).not.toBe(xmur3('oak')());
    });

    it('should return an unsigned 32-bit integer', () => {
        const value = xmur3('acorn')();
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(0xffffffff);
    });

    it('should advance to a new value on each call of the returned function', () => {
        const hash = xmur3('acorn');
        const first = hash();
        const second = hash();
        expect(first).not.toBe(second);
    });

    it('should hash the empty string without throwing', () => {
        expect(() => xmur3('')()).not.toThrow();
    });
});

describe('mulberry32', () => {
    it('should produce the same sequence for the same seed', () => {
        const a = mulberry32(42);
        const b = mulberry32(42);

        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });

    it('should produce different sequences for different seeds', () => {
        const a = mulberry32(1);
        const b = mulberry32(2);

        expect(a()).not.toBe(b());
    });

    it('should return numbers in [0, 1)', () => {
        const random = mulberry32(7);
        for (let i = 0; i < 1000; i++) {
            const value = random();
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThan(1);
        }
    });

    it('should not repeat within a short run', () => {
        const random = mulberry32(123);
        const values = new Set(Array.from({ length: 100 }, () => random()));
        expect(values.size).toBe(100);
    });
});

describe('createRandom', () => {
    it('should be deterministic for the same string seed', () => {
        const a = createRandom('acorn');
        const b = createRandom('acorn');

        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });

    it('should be deterministic for the same numeric seed', () => {
        const a = createRandom(42);
        const b = createRandom(42);

        expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    });

    it('should differ between different string seeds', () => {
        const a = createRandom('acorn');
        const b = createRandom('oak');

        expect(a()).not.toBe(b());
    });

    it('should differ between string and numeric seeds in general', () => {
        const a = createRandom('42');
        const b = createRandom(42);

        // Not a mathematical guarantee, but xmur3('42') should not collide
        // with the raw number 42 in practice.
        expect(a()).not.toBe(b());
    });
});
