import type { CanopyOptions } from './tree';

export type CanopyPreset = Partial<CanopyOptions>;

// autumnBlaze reuses this verbatim except for leafColor, so it's named
// rather than inlined into the presets map below.
const classicOak: CanopyPreset = {
    branchSpread: (2 * Math.PI) / 8,
    branchColor: '#5c4033',
    leafColor: '#3a7d3a',
    gravity: 0.1
};

export const presets: Record<string, CanopyPreset> = {
    classicOak,

    cherryBlossom: {
        maxDepth: 13,
        leafDepth: 3,
        leafColor: '#f7b7d2',
        branchColor: '#6b4226',
        gravity: 0.05
    },

    // leafDepth === maxDepth means depth never reaches it (the deepest
    // branches grown are at maxDepth - 1), so no branch ever switches to
    // leafColor and the whole tree stays branchColor.
    bareWinter: {
        maxDepth: 10,
        leafDepth: 10,
        spreadJitter: 2,
        trunkWidth: 12,
        branchWidth: 12,
        branchColor: '#4b4237'
    },

    weepingWillow: {
        branchSpread: 0.35,
        maxDepth: 14,
        gravity: 0.8,
        leafColor: '#6b8e6b'
    },

    // Negative gravity pushes branches further from straight-down rather than
    // toward it, which — combined with a narrow spread — exaggerates the
    // existing upward lean into a tapering spire instead of the wide dome a
    // binary fork naturally produces. Not a true whorled pine, but reads as
    // an evergreen silhouette rather than a mushroom cap.
    conifer: {
        branchSpread: 0.32,
        trunkLength: 70,
        leafDepth: 1,
        spreadJitter: 0.15,
        maxDepth: 13,
        gravity: -0.28,
        branchColor: '#123b22',
        leafColor: '#1e5631'
    },

    autumnBlaze: {
        ...classicOak,
        leafColor: '#d2691e'
    }
};
