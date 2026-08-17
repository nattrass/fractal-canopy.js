import type { CanopyOptions } from './tree';

export type CanopyPreset = Partial<CanopyOptions>;

// autumnBlaze reuses this verbatim except for leafColor, so it's named
// rather than inlined into the presets map below.
const classicOak: CanopyPreset = {
    branchSpread: (2 * Math.PI) / 8,
    branchColor: '#5c4033',
    leafColor: '#3a7d3a',
    gravity: 0.1,
    branchiness: 0.9,
    apicalDominance: 0.3,
    branchCurve: 0.2,
    massWeightedWidth: true,
    leafStyle: 'cluster'
};

export const presets: Record<string, CanopyPreset> = {
    classicOak,

    cherryBlossom: {
        maxDepth: 13,
        leafDepth: 3,
        leafColor: '#f7b7d2',
        branchColor: '#6b4226',
        gravity: 0.05,
        branchiness: 0.9,
        apicalDominance: 0.2,
        branchCurve: 0.15,
        massWeightedWidth: true,
        leafStyle: 'cluster'
    },

    // leafDepth === maxDepth means depth never reaches it (the deepest
    // branches grown are at maxDepth - 1), so no branch ever switches to
    // leafColor and the whole tree stays branchColor — leafStyle stays at
    // its 'line' default too, since cluster mode would have nothing to draw.
    bareWinter: {
        maxDepth: 10,
        leafDepth: 10,
        spreadJitter: 2,
        trunkWidth: 12,
        branchWidth: 12,
        branchColor: '#4b4237',
        branchiness: 0.85,
        apicalDominance: 0.3,
        branchCurve: 0.4,
        massWeightedWidth: true
    },

    weepingWillow: {
        branchSpread: 0.35,
        maxDepth: 14,
        gravity: 0.8,
        leafColor: '#6b8e6b',
        branchiness: 0.85,
        apicalDominance: 0.65,
        branchCurve: 0.5,
        massWeightedWidth: true,
        leafStyle: 'cluster'
    },

    autumnBlaze: {
        ...classicOak,
        leafColor: '#d2691e'
    }
};
