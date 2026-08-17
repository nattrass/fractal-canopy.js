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
    maxDepth: number;
    leafDepth: number;
    branchColor: string;
    leafColor: string;
    lineCap: CanvasLineCap;
}

interface Branch {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
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

            for (const branch of levels[depth]) {
                ctx.moveTo(branch.x1, branch.y1);
                ctx.lineTo(branch.x2, branch.y2);
            }

            ctx.stroke();
        }

        ctx.restore();
    }

    // Walks the fractal and returns the branch geometry bucketed by depth,
    // where levels[depth] holds every branch grown at that depth.
    GrowBranches(crown: Coordinate): Branch[][] {
        const options = this.options;
        const levels: Branch[][] = [];

        const grow = (x: number, y: number, length: number, angle: number, depth: number): void => {
            if (depth >= options.maxDepth) {
                return;
            }

            if (!levels[depth]) {
                levels[depth] = [];
            }

            // A branch forks left (+1) and right (-1) by half the spread, jittered
            // independently on each side so the canopy grows unevenly.
            for (const direction of [1, -1]) {
                const spread = options.branchSpread + Math.random() * options.spreadJitter;
                const branchAngle = angle + direction * (spread / 2);
                const endX = x + length * Math.sin(branchAngle);
                const endY = y + length * Math.cos(branchAngle);

                levels[depth].push({ x1: x, y1: y, x2: endX, y2: endY });
                grow(endX, endY, length * options.lengthScale, branchAngle, depth + 1);
            }
        };

        grow(crown.x, crown.y, options.branchLength, options.startAngle, 0);

        return levels;
    }
}
