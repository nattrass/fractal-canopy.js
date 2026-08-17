import { Coordinate } from './coordinate';

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
    maxDepth: number;
    leafDepth: number;
    branchColor: string;
    leafColor: string;
    lineCap: CanvasLineCap;
}

// Branch geometry below this length (in canvas units) is imperceptible on
// screen, so GrowBranches stops recursing rather than spending exponentially
// more time and memory on segments that wouldn't render visibly anyway.
const MIN_BRANCH_LENGTH = 1;

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
        maxDepth: 11,
        leafDepth: 5,
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
        ctx.lineTo(crown.x, crown.y);
        ctx.stroke();

        // Every branch at a given depth shares a width and colour, so each depth
        // is stroked as a single path rather than one path per branch.
        for (let depth = 0; depth < levels.length; depth++) {
            ctx.beginPath();
            ctx.lineWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            ctx.strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            const level = levels[depth];
            for (let i = 0; i < level.length; i += 4) {
                ctx.moveTo(level[i], level[i + 1]);
                ctx.lineTo(level[i + 2], level[i + 3]);
            }

            ctx.stroke();
        }

        ctx.restore();
    }

    // Walks the fractal and returns the branch geometry bucketed by depth, where
    // levels[depth] holds every branch grown at that depth as a flat
    // [x1, y1, x2, y2, x1, y1, x2, y2, ...] Float64Array (4 numbers per branch).
    //
    // Branch length only depends on depth (jitter affects angle, not length), so
    // the exact size of every level is known before growing a single branch.
    // That lets levels be allocated once as fixed-size typed arrays instead of
    // push()-ing a plain object per branch, which matters because branch count
    // doubles every depth: maxDepth 20 is ~2.1 million branches.
    GrowBranches(crown: Coordinate): Float64Array[] {
        const options = this.options;

        let depthLimit = 0;
        let previewLength = options.branchLength;
        while (depthLimit < options.maxDepth && previewLength >= MIN_BRANCH_LENGTH) {
            depthLimit++;
            previewLength *= options.lengthScale;
        }

        const levels: Float64Array[] = new Array(depthLimit);
        for (let i = 0; i < depthLimit; i++) {
            levels[i] = new Float64Array(2 ** (i + 1) * 4);
        }
        const cursors = new Uint32Array(depthLimit);

        const grow = (x: number, y: number, length: number, angle: number, depth: number): void => {
            if (depth >= depthLimit) {
                return;
            }

            const level = levels[depth];
            const nextLength = length * options.lengthScale;

            // A branch forks left (+1) and right (-1) by half the spread, jittered
            // independently on each side so the canopy grows unevenly. Unrolled
            // rather than looping over [1, -1] to avoid allocating a throwaway
            // array on every one of the (up to millions of) recursive calls.
            for (let i = 0; i < 2; i++) {
                const direction = i === 0 ? 1 : -1;
                const spread = options.branchSpread + Math.random() * options.spreadJitter;
                let branchAngle = angle + direction * (spread / 2);

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

                grow(endX, endY, nextLength, branchAngle, depth + 1);
            }
        };

        grow(crown.x, crown.y, options.branchLength, options.startAngle, 0);

        return levels;
    }
}
