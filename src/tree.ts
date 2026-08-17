import { Coordinate } from './coordinate';
import { createRandom, type RandomFn } from './random';

export interface CanopyOptions {
    originX: number;
    originY: number;
    startAngle: number;
    trunkLength: number;
    trunkWidth: number;
    branchLength: number;
    branchWidth: number;
    lengthScale: number;
    widthScale: number;
    branchSpread: number;
    spreadJitter: number;
    gravity: number;
    branchiness: number;
    apicalDominance: number;
    branchCurve: number;
    massWeightedWidth: boolean;
    maxDepth: number;
    leafDepth: number;
    leafStyle: 'line' | 'cluster';
    branchColor: string;
    leafColor: string;
    lineCap: CanvasLineCap;
    seed?: string | number;
}

// Branch geometry below this length (in canvas units) is imperceptible on
// screen, so GrowBranches stops recursing rather than spending exponentially
// more time and memory on segments that wouldn't render visibly anyway.
const MIN_BRANCH_LENGTH = 1;

// How much longer/shorter apicalDominance makes the primary/secondary child's
// next generation, as a fraction of lengthScale. Capped well below the point
// where the boosted lineage could stop shrinking (see previewScale below), and
// kept fairly subtle — even a modest boost compounds fast over many
// generations (this is a per-generation multiplier applied recursively).
const DOMINANCE_LENGTH_BOOST = 0.15;

// How much apicalDominance straightens the primary child (reduces its angular
// deviation from its parent's heading) versus the secondary child. A leader
// branch that always took the full spread jitter, generation after
// generation, would accumulate a one-directional rotational bias and spiral
// — real apical dominance grows straighter as well as longer, which is also
// what keeps the boosted-length lineage from curling back on itself.
const DOMINANCE_STRAIGHTNESS = 0.85;

// How far branchCurve bows a segment away from a straight line, as a fraction
// of the segment's own length.
const CURVE_BOW_FRACTION = 0.26;

// Leaf cluster blob sizing, in canvas units — tuned by eye, not derived from
// any option, since they're a fixed rendering flourish rather than a
// geometry-affecting parameter.
const LEAF_BLOBS_MIN = 2;
const LEAF_BLOBS_RANGE = 2;
const LEAF_BLOB_MIN_RADIUS = 2;
const LEAF_BLOB_RADIUS_RANGE = 3;
const LEAF_BLOB_SPREAD = 6;

// Shading for leaf blobs: a radial gradient overlay, highlight offset toward
// one consistent light direction (upper-left) fading through transparent to
// a darker rim. Layered as rgba(white/black) over the flat leafColor fill
// rather than computed from leafColor itself, so it works identically for
// any colour (named, hex, whatever) with no colour parsing needed.
const LEAF_LIGHT_OFFSET_FRACTION = 0.35;
const LEAF_HIGHLIGHT_ALPHA = 0.55;
const LEAF_SHADOW_ALPHA = 0.3;

// Stateless pseudo-random hash (the classic "sin scramble" trick): maps any
// number to a pseudo-random value in [0, 1), deterministic for a given input
// with no PRNG state to carry around. Used for leaf cluster jitter, where the
// input is derived from a branch tip's own coordinates.
function hashToUnit(n: number): number {
    const x = Math.sin(n) * 43758.5453123;
    return x - Math.floor(x);
}

// angle=0 points straight down (sin(0)=0, cos(0)=1, and y increases downward
// on a canvas), so "downward" is the target for gravity. Returns the signed
// rotation in (-PI, PI] that would take `angle` to 0 by the shorter way
// around, so biasing an angle toward it always droops rather than occasionally
// spinning the branch the long way round.
function angleToDownward(angle: number): number {
    const TWO_PI = Math.PI * 2;
    let diff = -angle % TWO_PI;
    if (diff > Math.PI) diff -= TWO_PI;
    if (diff < -Math.PI) diff += TWO_PI;
    return diff;
}

export class Canopy {
    static defaults: CanopyOptions = {
        originX: 400,
        originY: 400,
        startAngle: Math.PI,
        trunkLength: 100,
        trunkWidth: 20,
        branchLength: 75,
        branchWidth: 20,
        lengthScale: 0.75,
        widthScale: 0.6,
        branchSpread: (2 * Math.PI) / 11,
        spreadJitter: 1,
        gravity: 0,
        branchiness: 1,
        apicalDominance: 0,
        branchCurve: 0,
        massWeightedWidth: false,
        maxDepth: 11,
        leafDepth: 5,
        leafStyle: 'line',
        branchColor: 'Black',
        leafColor: 'Green',
        lineCap: 'round'
    };

    ctx: CanvasRenderingContext2D;
    options: CanopyOptions;

    constructor(ctx: CanvasRenderingContext2D, options?: Partial<CanopyOptions>) {
        this.ctx = ctx;
        this.options = Object.assign({}, Canopy.defaults, options);
    }

    RenderCanopy(): void {
        const ctx = this.ctx;
        const options = this.options;
        const base = new Coordinate(options.originX, options.originY);
        const crown = new Coordinate(base.x, base.y - options.trunkLength);
        const levels = this.GrowBranches(crown);

        ctx.save();

        // Branches narrow at every fork, so a flat cap would leave the parent's
        // square end poking out past its children. A round cap fills the joint.
        ctx.lineCap = options.lineCap;

        ctx.beginPath();
        ctx.lineWidth = options.trunkWidth;
        ctx.strokeStyle = options.branchColor;
        ctx.moveTo(base.x, base.y);
        this.drawSegment(base.x, base.y, crown.x, crown.y, 0);
        ctx.stroke();

        if (options.massWeightedWidth) {
            this.drawLevelsMassWeighted(levels);
        } else {
            this.drawLevelsUniform(levels);
        }

        if (options.leafStyle === 'cluster') {
            this.drawLeafClusters(levels);
        }

        ctx.restore();
    }

    // Default path, unchanged from before branchCurve/massWeightedWidth existed:
    // every branch at a depth shares a width and colour, so each depth is
    // stroked as a single path rather than one path per branch.
    private drawLevelsUniform(levels: Float64Array[]): void {
        const ctx = this.ctx;
        const options = this.options;

        for (let depth = 0; depth < levels.length; depth++) {
            ctx.beginPath();
            ctx.lineWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            ctx.strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            const level = levels[depth];
            for (let i = 0; i < level.length; i += 4) {
                ctx.moveTo(level[i], level[i + 1]);
                this.drawSegment(level[i], level[i + 1], level[i + 2], level[i + 3], i);
            }

            ctx.stroke();
        }
    }

    // massWeightedWidth trades the batched one-stroke-per-depth path above for
    // one stroke per branch, so each branch's width can reflect its own actual
    // length (via apicalDominance) rather than a single depth-wide value. Only
    // takes this slower path when the option is on.
    private drawLevelsMassWeighted(levels: Float64Array[]): void {
        const ctx = this.ctx;
        const options = this.options;

        for (let depth = 0; depth < levels.length; depth++) {
            const level = levels[depth];
            const nominalLength = options.branchLength * Math.pow(options.lengthScale, depth);
            const baseWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            const strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            for (let i = 0; i < level.length; i += 4) {
                const x1 = level[i];
                const y1 = level[i + 1];
                const x2 = level[i + 2];
                const y2 = level[i + 3];
                const actualLength = Math.hypot(x2 - x1, y2 - y1);
                const widthFactor = nominalLength > 0 ? actualLength / nominalLength : 1;

                ctx.beginPath();
                ctx.lineWidth = baseWidth * widthFactor;
                ctx.strokeStyle = strokeStyle;
                ctx.moveTo(x1, y1);
                this.drawSegment(x1, y1, x2, y2, i);
                ctx.stroke();
            }
        }
    }

    // A small filled cluster near each outermost tip, layered on top of the
    // ordinary coloured twigs rather than replacing them. Only applies to the
    // deepest level actually grown, and only if that level would already be
    // drawn in leafColor — respecting leafDepth means a preset like
    // bareWinter (leafDepth >= maxDepth) stays leafless in cluster mode too.
    private drawLeafClusters(levels: Float64Array[]): void {
        const ctx = this.ctx;
        const options = this.options;
        if (levels.length === 0 || levels.length - 1 < options.leafDepth) {
            return;
        }

        const tips = levels[levels.length - 1];

        for (let i = 0; i < tips.length; i += 4) {
            const tipX = tips[i + 2];
            const tipY = tips[i + 3];
            // A tip's own (already seed-deterministic, via GrowBranches)
            // coordinates stand in for a random seed here, via a stateless
            // hash — no separate PRNG needed, and trivially reproducible by
            // any consumer that already has the tip coordinates (e.g. the
            // playground's own auto-fit draw path) without needing access to
            // the library's internal random module.
            const tipSeed = tipX * 12.9898 + tipY * 78.233;
            const blobCount = LEAF_BLOBS_MIN + Math.floor(hashToUnit(tipSeed) * (LEAF_BLOBS_RANGE + 1));

            for (let b = 0; b < blobCount; b++) {
                const angle = hashToUnit(tipSeed + b * 17.31 + 1.1) * Math.PI * 2;
                const dist = hashToUnit(tipSeed + b * 17.31 + 2.2) * LEAF_BLOB_SPREAD;
                const radius = LEAF_BLOB_MIN_RADIUS + hashToUnit(tipSeed + b * 17.31 + 3.3) * LEAF_BLOB_RADIUS_RANGE;
                const blobX = tipX + Math.cos(angle) * dist;
                const blobY = tipY + Math.sin(angle) * dist;

                ctx.beginPath();
                ctx.arc(blobX, blobY, radius, 0, Math.PI * 2);
                ctx.fillStyle = options.leafColor;
                ctx.fill();

                const shading = ctx.createRadialGradient(
                    blobX - radius * LEAF_LIGHT_OFFSET_FRACTION,
                    blobY - radius * LEAF_LIGHT_OFFSET_FRACTION,
                    0,
                    blobX,
                    blobY,
                    radius
                );
                shading.addColorStop(0, `rgba(255, 255, 255, ${LEAF_HIGHLIGHT_ALPHA})`);
                shading.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
                shading.addColorStop(1, `rgba(0, 0, 0, ${LEAF_SHADOW_ALPHA})`);
                ctx.fillStyle = shading;
                ctx.fill();
            }
        }
    }

    // Draws x1,y1 -> x2,y2 (x1,y1 assumed already the current point via
    // moveTo) as either a straight line (branchCurve 0, the default — uses
    // ctx.lineTo exactly as before this option existed) or a gentle quadratic
    // bow. `variant` alternates the bow direction between adjacent branches
    // (consecutive entries in a level are the +1/-1 direction siblings from
    // GrowBranches) purely so neighbouring curves don't all bulge the same
    // way — it carries no other meaning.
    private drawSegment(x1: number, y1: number, x2: number, y2: number, variant: number): void {
        const ctx = this.ctx;
        const branchCurve = this.options.branchCurve;

        if (branchCurve === 0) {
            ctx.lineTo(x2, y2);
            return;
        }

        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.hypot(dx, dy) || 1;
        const sign = (variant / 4) % 2 === 0 ? 1 : -1;
        const bow = branchCurve * length * CURVE_BOW_FRACTION * sign;
        const midX = (x1 + x2) / 2 + (-dy / length) * bow;
        const midY = (y1 + y2) / 2 + (dx / length) * bow;

        ctx.quadraticCurveTo(midX, midY, x2, y2);
    }

    // Walks the fractal and returns the branch geometry bucketed by depth, where
    // levels[depth] holds every branch grown at that depth as a flat
    // [x1, y1, x2, y2, x1, y1, x2, y2, ...] Float64Array (4 numbers per branch).
    // Always exactly 4 numbers per branch — branchiness/apicalDominance change
    // which/how many branches exist, never this layout.
    //
    // At default options every level is a full binary tree (2^(depth+1)
    // branches), known before growing a single branch since length only
    // depends on depth. That lets levels be allocated once as fixed-size
    // typed arrays instead of push()-ing a plain object per branch — matters
    // because branch count doubles every depth: maxDepth 20 is ~2.1 million
    // branches. branchiness/apicalDominance can only *prune* branches relative
    // to that full-binary upper bound (never add more), so the same
    // preallocated buffers still work; unused capacity is trimmed off the end
    // once the actual count is known.
    GrowBranches(crown: Coordinate): Float64Array[] {
        const options = this.options;

        // Reseeded on every call, so re-rendering the same seeded options
        // reproduces the same tree instead of drawing a new random one. An
        // undefined seed falls back to Math.random — today's behaviour,
        // unaffected by anything above.
        const random: RandomFn = options.seed === undefined ? Math.random : createRandom(options.seed);

        // The depth cutoff is sized against the *slowest* per-generation decay
        // any lineage can have, so a dominant (apicalDominance) lineage never
        // gets cut off before its own length actually drops below
        // MIN_BRANCH_LENGTH. Capped at 0.99 so even an extreme dominance
        // setting still eventually shrinks below the threshold rather than
        // recursing forever.
        const previewScale = options.apicalDominance === 0
            ? options.lengthScale
            : Math.min(0.99, options.lengthScale * (1 + options.apicalDominance * DOMINANCE_LENGTH_BOOST));

        let depthLimit = 0;
        let previewLength = options.branchLength;
        while (depthLimit < options.maxDepth && previewLength >= MIN_BRANCH_LENGTH) {
            depthLimit++;
            previewLength *= previewScale;
        }

        const levels: Float64Array[] = new Array(depthLimit);
        for (let i = 0; i < depthLimit; i++) {
            levels[i] = new Float64Array(2 ** (i + 1) * 4);
        }
        const cursors = new Uint32Array(depthLimit);

        const grow = (x: number, y: number, length: number, angle: number, depth: number): void => {
            if (depth >= depthLimit || length < MIN_BRANCH_LENGTH) {
                return;
            }

            const level = levels[depth];

            // A branch forks left (+1) and right (-1) by half the spread, jittered
            // independently on each side so the canopy grows unevenly. Unrolled
            // rather than looping over [1, -1] to avoid allocating a throwaway
            // array on every one of the (up to millions of) recursive calls.
            for (let i = 0; i < 2; i++) {
                const direction = i === 0 ? 1 : -1;
                const isPrimary = i === 0;

                // branchiness: the primary (i=0) child always continues; the
                // secondary child is skipped with probability
                // (1 - branchiness), giving nodes with one child as well as
                // two instead of every fork being exactly binary. At the
                // default (1), the branchiness check short-circuits before
                // calling random() at all, so default output and seed
                // reproducibility are completely unaffected.
                if (!isPrimary && options.branchiness !== 1 && random() >= options.branchiness) {
                    continue;
                }

                const spread = options.branchSpread + random() * options.spreadJitter;

                // apicalDominance straightens the primary child (and, symmetrically,
                // widens the secondary's deviation) rather than leaving both at the
                // same angular kick — without this, a boosted-length primary lineage
                // would keep taking the *full* spread every generation, in the same
                // rotational direction each time (always direction=+1), and spiral
                // back on itself over enough generations. At the default (0) this
                // factor is exactly 1 for both, unchanged.
                const angleFactor = options.apicalDominance === 0
                    ? 1
                    : 1 + (isPrimary ? -1 : 1) * options.apicalDominance * DOMINANCE_STRAIGHTNESS;
                let branchAngle = angle + direction * (spread / 2) * angleFactor;

                // Droop outer branches more than inner ones: at depth 0 this is a
                // no-op (0/maxDepth), and gravity 0 leaves branchAngle untouched
                // exactly (a no-op * anything finite is exactly 0 in IEEE754), so
                // existing geometry is unaffected unless gravity is set.
                if (options.gravity !== 0) {
                    branchAngle += options.gravity * (depth / options.maxDepth) * angleToDownward(branchAngle);
                }

                const endX = x + length * Math.sin(branchAngle);
                const endY = y + length * Math.cos(branchAngle);

                const offset = cursors[depth];
                level[offset] = x;
                level[offset + 1] = y;
                level[offset + 2] = endX;
                level[offset + 3] = endY;
                cursors[depth] = offset + 4;

                // apicalDominance: the primary lineage's next generation shrinks
                // more slowly than lengthScale alone would, the secondary
                // lineage's shrinks faster, so one side reads as the dominant
                // "leader" over several generations. At the default (0) this
                // is exactly options.lengthScale for both, unchanged.
                const childScale = options.apicalDominance === 0
                    ? options.lengthScale
                    : Math.min(0.99, options.lengthScale * (1 + (isPrimary ? 1 : -1) * options.apicalDominance * DOMINANCE_LENGTH_BOOST));
                const nextLength = length * childScale;

                grow(endX, endY, nextLength, branchAngle, depth + 1);
            }
        };

        grow(crown.x, crown.y, options.branchLength, options.startAngle, 0);

        // Trim each level down to its actual branch count. At default options
        // every branch that could exist does, so cursors[i] === levels[i].length
        // and this is a no-op (subarray returns the same effective view, no
        // copy) — only branchiness/apicalDominance-driven early termination
        // ever leaves unused capacity.
        for (let i = 0; i < depthLimit; i++) {
            if (cursors[i] !== levels[i].length) {
                levels[i] = levels[i].subarray(0, cursors[i]);
            }
        }

        return levels;
    }
}
