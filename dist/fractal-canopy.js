class Coordinate {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Coordinate;
}
const CoordinateClass = typeof module !== 'undefined' && module.exports ? require('./coordinate') : Coordinate;

class Canopy {
    constructor(ctx, options) {
        this.ctx = ctx;
        this.options = Object.assign({}, Canopy.defaults, options);
    }

    RenderCanopy() {
        const ctx = this.ctx;
        const options = this.options;
        const base = new CoordinateClass(options.originX, options.originY);
        const crown = new CoordinateClass(base.x, base.y - options.trunkLength);
        const levels = this.GrowBranches(crown);

        ctx.save();

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
    GrowBranches(crown) {
        const options = this.options;
        const levels = [];

        const grow = (x, y, length, angle, depth) => {
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

Canopy.defaults = {
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
    leafColor: 'Green'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Canopy;
}
