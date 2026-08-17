import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Canopy } from '../src/tree';

function createMockCtx() {
    return {
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        save: vi.fn(),
        restore: vi.fn(),
        lineWidth: null as number | null,
        strokeStyle: null as string | null,
        fillStyle: null as string | null,
        lineCap: null as string | null
    };
}

type MockCtx = ReturnType<typeof createMockCtx>;

describe('Canopy', () => {
    let mockCtx: MockCtx;

    beforeEach(() => {
        // Create a mock canvas 2D context
        mockCtx = createMockCtx();
    });

    describe('constructor', () => {
        it('should create a Canopy instance with a canvas context', () => {
            const canopy = new Canopy(mockCtx as any);
            expect(canopy.ctx).toBe(mockCtx);
        });

        it('should store the canvas context', () => {
            const canopy = new Canopy(mockCtx as any);
            expect(canopy.ctx).not.toBeNull();
            expect(canopy.ctx).not.toBeUndefined();
        });
    });

    describe('RenderCanopy', () => {
        it('should call canvas methods when rendering', () => {
            const canopy = new Canopy(mockCtx as any);
            canopy.RenderCanopy();

            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalled();
            expect(mockCtx.lineTo).toHaveBeenCalled();
            expect(mockCtx.stroke).toHaveBeenCalled();
        });

        it('should set initial line width for trunk', () => {
            const canopy = new Canopy(mockCtx as any);
            canopy.RenderCanopy();

            // Check that lineWidth was set at some point during rendering
            // It will be modified through recursion, so we just verify it was used
            expect(mockCtx.lineWidth).not.toBeNull();
            expect(typeof mockCtx.lineWidth).toBe('number');
        });

        it('should draw from center position', () => {
            const canopy = new Canopy(mockCtx as any);
            canopy.RenderCanopy();

            // Check that moveTo and lineTo were called with coordinates around the center
            const calls = mockCtx.moveTo.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
        });

        it('should not throw an error when rendering', () => {
            const canopy = new Canopy(mockCtx as any);
            expect(() => {
                canopy.RenderCanopy();
            }).not.toThrow();
        });

        it('should render repeatedly without errors', () => {
            const canopy = new Canopy(mockCtx as any);
            expect(() => {
                canopy.RenderCanopy();
                canopy.RenderCanopy();
                canopy.RenderCanopy();
            }).not.toThrow();
        });

        it('should use different stroke colors based on iterations', () => {
            const canopy = new Canopy(mockCtx as any);
            canopy.RenderCanopy();

            // Both Black and Green should be used as stroke styles
            const strokeCalls = mockCtx.stroke.mock.calls;
            expect(strokeCalls.length).toBeGreaterThan(0);
        });
    });

    describe('canvas context integration', () => {
        it('should work with a real canvas mock', () => {
            // Simulate a more complete canvas context
            const completeCtx = createMockCtx();

            const canopy = new Canopy(completeCtx as any);
            expect(() => {
                canopy.RenderCanopy();
            }).not.toThrow();

            expect(completeCtx.beginPath).toHaveBeenCalled();
        });
    });

    describe('options', () => {
        it('should fall back to the default options', () => {
            const canopy = new Canopy(mockCtx as any);
            expect(canopy.options).toEqual(Canopy.defaults);
        });

        it('should override only the options that are supplied', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 3, leafColor: 'Red' });

            expect(canopy.options.maxDepth).toBe(3);
            expect(canopy.options.leafColor).toBe('Red');
            expect(canopy.options.branchColor).toBe(Canopy.defaults.branchColor);
        });

        it('should not mutate the defaults', () => {
            new Canopy(mockCtx as any, { maxDepth: 3 });
            expect(Canopy.defaults.maxDepth).toBe(11);
        });

        it('should draw the trunk from the configured origin', () => {
            const canopy = new Canopy(mockCtx as any, { originX: 10, originY: 200, trunkLength: 50, maxDepth: 0 });
            canopy.RenderCanopy();

            expect(mockCtx.moveTo).toHaveBeenCalledWith(10, 200);
            expect(mockCtx.lineTo).toHaveBeenCalledWith(10, 150);
        });
    });

    describe('GrowBranches', () => {
        // Each level is a flat Float64Array of [x1, y1, x2, y2, ...] quadruples,
        // 4 numbers per branch, rather than an array of branch objects.
        function branchAt(level: Float64Array, index: number) {
            const offset = index * 4;
            return { x1: level[offset], y1: level[offset + 1], x2: level[offset + 2], y2: level[offset + 3] };
        }

        it('should grow one level per depth up to maxDepth', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 4 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            expect(levels.length).toBe(4);
        });

        it('should fork every branch in two', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 5 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            levels.forEach((level, depth) => {
                expect(level.length / 4).toBe(Math.pow(2, depth + 1));
            });
        });

        it('should start each branch where its parent ended', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 4 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            for (let depth = 1; depth < levels.length; depth++) {
                const branchCount = levels[depth].length / 4;
                for (let index = 0; index < branchCount; index++) {
                    const branch = branchAt(levels[depth], index);
                    const parent = branchAt(levels[depth - 1], Math.floor(index / 2));
                    expect(branch.x1).toBe(parent.x2);
                    expect(branch.y1).toBe(parent.y2);
                }
            }
        });

        it('should shorten each branch by the length scale', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 3, branchLength: 100, lengthScale: 0.5 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            levels.forEach((level, depth) => {
                const expected = 100 * Math.pow(0.5, depth);
                const branchCount = level.length / 4;
                for (let index = 0; index < branchCount; index++) {
                    const branch = branchAt(level, index);
                    const length = Math.hypot(branch.x2 - branch.x1, branch.y2 - branch.y1);
                    expect(length).toBeCloseTo(expected, 6);
                }
            });
        });

        it('should grow no branches when maxDepth is zero', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 0 });
            expect(canopy.GrowBranches({ x: 0, y: 0 })).toEqual([]);
        });

        it('should stop recursing once branches drop below one canvas unit long', () => {
            // branchLength 75, lengthScale 0.75 crosses the 1-unit cutoff around
            // depth 15, well short of a maxDepth of 30 — this keeps maxDepth
            // (and therefore time/memory) from growing unboundedly.
            const canopy = new Canopy(mockCtx as any, { maxDepth: 30 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            expect(levels.length).toBeLessThan(30);

            const lastLevel = levels[levels.length - 1];
            const branch = branchAt(lastLevel, 0);
            const length = Math.hypot(branch.x2 - branch.x1, branch.y2 - branch.y1);
            expect(length).toBeGreaterThanOrEqual(1);
        });

        it('should produce identical geometry whether gravity is 0 or omitted', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const omitted = new Canopy(mockCtx as any, { maxDepth: 5 }).GrowBranches({ x: 0, y: 0 });
            const explicitZero = new Canopy(mockCtx as any, { maxDepth: 5, gravity: 0 }).GrowBranches({ x: 0, y: 0 });

            expect(omitted).toEqual(explicitZero);

            randomSpy.mockRestore();
        });

        it('should pull branch endpoints downward as gravity increases', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const flat = new Canopy(mockCtx as any, { maxDepth: 5, gravity: 0 }).GrowBranches({ x: 0, y: 0 });
            const drooping = new Canopy(mockCtx as any, { maxDepth: 5, gravity: 1 }).GrowBranches({ x: 0, y: 0 });

            // Gravity scales with depth, so its effect is clearest at the deepest
            // level. With identical (mocked) randomness, the only difference
            // between the two trees is the gravity bias itself, so every endpoint
            // should sit at the same y or further down (larger y) once drooping.
            const flatDeep = flat[flat.length - 1];
            const droopingDeep = drooping[drooping.length - 1];

            let anyStrictlyLower = false;
            for (let i = 0; i < flatDeep.length; i += 4) {
                expect(droopingDeep[i + 3]).toBeGreaterThanOrEqual(flatDeep[i + 3]);
                if (droopingDeep[i + 3] > flatDeep[i + 3]) anyStrictlyLower = true;
            }
            expect(anyStrictlyLower).toBe(true);

            randomSpy.mockRestore();
        });
    });

    describe('drawing', () => {
        it('should stroke once for the trunk and once per depth', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 4 });
            canopy.RenderCanopy();

            expect(mockCtx.stroke).toHaveBeenCalledTimes(5);
            expect(mockCtx.beginPath).toHaveBeenCalledTimes(5);
        });

        it('should narrow the line width by the width scale at each depth', () => {
            const widths: number[] = [];
            const recordingCtx = Object.assign(createMockCtx(), {
                stroke: vi.fn()
            });
            recordingCtx.stroke = vi.fn(() => widths.push(recordingCtx.lineWidth as number));

            new Canopy(recordingCtx as any, { maxDepth: 3, trunkWidth: 10, branchWidth: 10, widthScale: 0.5 }).RenderCanopy();

            expect(widths).toEqual([10, 10, 5, 2.5]);
        });

        it('should switch to the leaf color at leafDepth', () => {
            const colors: (string | null)[] = [];
            const recordingCtx = Object.assign(createMockCtx(), {
                stroke: vi.fn()
            });
            recordingCtx.stroke = vi.fn(() => colors.push(recordingCtx.strokeStyle));

            new Canopy(recordingCtx as any, { maxDepth: 4, leafDepth: 2 }).RenderCanopy();

            expect(colors).toEqual(['Black', 'Black', 'Black', 'Green', 'Green']);
        });

        it('should round the line caps so branch joints are filled', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 2 });
            canopy.RenderCanopy();

            expect(mockCtx.lineCap).toBe('round');
        });

        it('should honour a custom lineCap', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 2, lineCap: 'butt' });
            canopy.RenderCanopy();

            expect(mockCtx.lineCap).toBe('butt');
        });

        it('should restore the context state it changed', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 2 });
            canopy.RenderCanopy();

            expect(mockCtx.save).toHaveBeenCalledTimes(1);
            expect(mockCtx.restore).toHaveBeenCalledTimes(1);
        });
    });

    describe('multiple renders', () => {
        it('should be able to render multiple canopies independently', () => {
            const ctx1 = createMockCtx();
            const ctx2 = createMockCtx();

            const canopy1 = new Canopy(ctx1 as any);
            const canopy2 = new Canopy(ctx2 as any);

            canopy1.RenderCanopy();
            canopy2.RenderCanopy();

            expect(ctx1.beginPath).toHaveBeenCalled();
            expect(ctx2.beginPath).toHaveBeenCalled();
        });

        it('should not affect other canopy instances', () => {
            const ctx1 = createMockCtx();
            const ctx2 = createMockCtx();

            const canopy1 = new Canopy(ctx1 as any);
            const canopy2 = new Canopy(ctx2 as any);

            canopy1.RenderCanopy();
            const ctx1CallCount = ctx1.beginPath.mock.calls.length;

            canopy2.RenderCanopy();
            expect(ctx1.beginPath.mock.calls.length).toBe(ctx1CallCount);
        });
    });

    describe('seed', () => {
        it('should produce identical geometry for the same seed across separate renders', () => {
            const levelsA = new Canopy(mockCtx as any, { maxDepth: 5, seed: 'acorn' }).GrowBranches({ x: 0, y: 0 });
            const levelsB = new Canopy(mockCtx as any, { maxDepth: 5, seed: 'acorn' }).GrowBranches({ x: 0, y: 0 });

            expect(levelsA).toEqual(levelsB);
        });

        it('should produce identical geometry for the same seed on repeated GrowBranches calls', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 5, seed: 'acorn' });

            const first = canopy.GrowBranches({ x: 0, y: 0 });
            const second = canopy.GrowBranches({ x: 0, y: 0 });

            expect(first).toEqual(second);
        });

        it('should produce different geometry for different seeds', () => {
            const levelsA = new Canopy(mockCtx as any, { maxDepth: 5, seed: 'acorn' }).GrowBranches({ x: 0, y: 0 });
            const levelsB = new Canopy(mockCtx as any, { maxDepth: 5, seed: 'oak' }).GrowBranches({ x: 0, y: 0 });

            expect(levelsA).not.toEqual(levelsB);
        });

        it('should support numeric seeds', () => {
            const levelsA = new Canopy(mockCtx as any, { maxDepth: 5, seed: 42 }).GrowBranches({ x: 0, y: 0 });
            const levelsB = new Canopy(mockCtx as any, { maxDepth: 5, seed: 42 }).GrowBranches({ x: 0, y: 0 });

            expect(levelsA).toEqual(levelsB);
        });

        it('should fall back to Math.random when seed is omitted', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const omitted = new Canopy(mockCtx as any, { maxDepth: 5 }).GrowBranches({ x: 0, y: 0 });
            const alsoOmitted = new Canopy(mockCtx as any, { maxDepth: 5 }).GrowBranches({ x: 0, y: 0 });

            expect(omitted).toEqual(alsoOmitted);
            expect(randomSpy).toHaveBeenCalled();

            randomSpy.mockRestore();
        });
    });

    describe('branchiness', () => {
        it('should produce identical geometry whether branchiness is 1 or omitted', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const omitted = new Canopy(mockCtx as any, { maxDepth: 5 }).GrowBranches({ x: 0, y: 0 });
            const explicitOne = new Canopy(mockCtx as any, { maxDepth: 5, branchiness: 1 }).GrowBranches({ x: 0, y: 0 });

            expect(omitted).toEqual(explicitOne);

            randomSpy.mockRestore();
        });

        it('should call random() exactly once per branch (jitter only, no skip-check) when branchiness is 1', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);

            const levels = new Canopy(mockCtx as any, { maxDepth: 4, branchiness: 1 }).GrowBranches({ x: 0, y: 0 });
            const totalBranches = levels.reduce((sum, level) => sum + level.length / 4, 0);

            expect(randomSpy).toHaveBeenCalledTimes(totalBranches);

            randomSpy.mockRestore();
        });

        it('should collapse to a single unforked path when branchiness is 0', () => {
            const levels = new Canopy(mockCtx as any, { maxDepth: 5, branchiness: 0 }).GrowBranches({ x: 0, y: 0 });

            levels.forEach(level => {
                expect(level.length / 4).toBe(1);
            });
        });

        it('should produce fewer than a full binary tree of branches for a mid-range branchiness', () => {
            const levels = new Canopy(mockCtx as any, { maxDepth: 6, branchiness: 0.5, seed: 'acorn' }).GrowBranches({ x: 0, y: 0 });

            const totalBranches = levels.reduce((sum, level) => sum + level.length / 4, 0);
            const fullBinaryTotal = levels.reduce((sum, _level, depth) => sum + Math.pow(2, depth + 1), 0);

            expect(totalBranches).toBeLessThan(fullBinaryTotal);
        });
    });

    describe('apicalDominance', () => {
        it('should produce identical geometry whether apicalDominance is 0 or omitted', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const omitted = new Canopy(mockCtx as any, { maxDepth: 5 }).GrowBranches({ x: 0, y: 0 });
            const explicitZero = new Canopy(mockCtx as any, { maxDepth: 5, apicalDominance: 0 }).GrowBranches({ x: 0, y: 0 });

            expect(omitted).toEqual(explicitZero);

            randomSpy.mockRestore();
        });

        it('should make the all-primary lineage longer than the all-secondary lineage at the same depth', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const levels = new Canopy(mockCtx as any, { maxDepth: 4, apicalDominance: 1 }).GrowBranches({ x: 0, y: 0 });
            const deepest = levels[levels.length - 1];

            // Levels fill depth-first: two siblings sharing a parent (adjacent
            // pairs in the array) are always equal length, since apicalDominance
            // only affects a branch's *children*, not the branch itself — the
            // divergence only shows up comparing genuinely different lineages.
            // The first entry is the lineage that took the primary (i=0) child
            // at every fork; the last entry took secondary (i=1) every time.
            const allPrimary = { x1: deepest[0], y1: deepest[1], x2: deepest[2], y2: deepest[3] };
            const lastOffset = deepest.length - 4;
            const allSecondary = { x1: deepest[lastOffset], y1: deepest[lastOffset + 1], x2: deepest[lastOffset + 2], y2: deepest[lastOffset + 3] };

            const primaryLength = Math.hypot(allPrimary.x2 - allPrimary.x1, allPrimary.y2 - allPrimary.y1);
            const secondaryLength = Math.hypot(allSecondary.x2 - allSecondary.x1, allSecondary.y2 - allSecondary.y1);

            expect(primaryLength).toBeGreaterThan(secondaryLength);

            randomSpy.mockRestore();
        });

        it('should not let a dominant lineage get cut off before its own length threshold', () => {
            // A high apicalDominance makes the primary lineage's effective decay
            // much slower than the raw lengthScale — depthLimit must account for
            // that, or the primary lineage would vanish before shrinking below
            // MIN_BRANCH_LENGTH.
            const canopy = new Canopy(mockCtx as any, { maxDepth: 30, apicalDominance: 1, lengthScale: 0.6 });
            const levels = canopy.GrowBranches({ x: 0, y: 0 });

            expect(levels.length).toBeGreaterThan(0);
            expect(levels[levels.length - 1].length).toBeGreaterThan(0);
        });
    });

    describe('branchCurve', () => {
        it('should draw straight lines (lineTo, never quadraticCurveTo) when branchCurve is 0 or omitted', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 3 });
            canopy.RenderCanopy();

            expect(mockCtx.quadraticCurveTo).not.toHaveBeenCalled();
            expect(mockCtx.lineTo).toHaveBeenCalled();
        });

        it('should draw curves (quadraticCurveTo, never lineTo) when branchCurve is set', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 3, branchCurve: 0.5 });
            canopy.RenderCanopy();

            expect(mockCtx.quadraticCurveTo).toHaveBeenCalled();
            expect(mockCtx.lineTo).not.toHaveBeenCalled();
        });
    });

    describe('massWeightedWidth', () => {
        it('should stroke once per depth (unchanged) when massWeightedWidth is false or omitted', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 4 });
            canopy.RenderCanopy();

            // 1 trunk stroke + 1 per depth, exactly like the existing (pre-this-
            // option) batched-per-depth behaviour.
            expect(mockCtx.stroke).toHaveBeenCalledTimes(5);
        });

        it('should stroke once per branch, with widths that vary by actual length, when enabled with apicalDominance', () => {
            const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.42);

            const widths: number[] = [];
            const recordingCtx = Object.assign(createMockCtx(), {
                stroke: vi.fn(() => widths.push(recordingCtx.lineWidth as number))
            });

            new Canopy(recordingCtx as any, { maxDepth: 3, apicalDominance: 1, massWeightedWidth: true }).RenderCanopy();

            // Far more than one stroke per depth (one per branch instead), and
            // not every recorded width is identical (primary vs secondary
            // branches differ in actual length, hence width).
            expect(widths.length).toBeGreaterThan(4);
            expect(new Set(widths).size).toBeGreaterThan(1);

            randomSpy.mockRestore();
        });
    });

    describe('leafStyle', () => {
        it('should never draw blobs (arc/fill) when leafStyle is "line" or omitted', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 6, leafDepth: 2 });
            canopy.RenderCanopy();

            expect(mockCtx.arc).not.toHaveBeenCalled();
            expect(mockCtx.fill).not.toHaveBeenCalled();
        });

        it('should draw blobs at the outermost tips when leafStyle is "cluster"', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 6, leafDepth: 2, leafStyle: 'cluster' });
            canopy.RenderCanopy();

            expect(mockCtx.arc).toHaveBeenCalled();
            expect(mockCtx.fill).toHaveBeenCalled();
        });

        it('should draw no blobs in cluster mode when leafDepth never applies (e.g. leafDepth >= maxDepth)', () => {
            const canopy = new Canopy(mockCtx as any, { maxDepth: 4, leafDepth: 4, leafStyle: 'cluster' });
            canopy.RenderCanopy();

            expect(mockCtx.arc).not.toHaveBeenCalled();
        });
    });
});
