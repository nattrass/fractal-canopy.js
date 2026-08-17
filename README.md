# fractal-canopy.js

JavaScript library for rendering a [Fractal Canopy](https://en.wikipedia.org/wiki/Fractal_canopy) onto an HTML5 canvas.

![A Fractal Canopy](fractal-canopy.png)

## About

A fractal canopy is a fractal structure that resembles a tree canopy. This library provides an easy way to generate and display these beautiful recursive patterns on an HTML5 canvas.

## Installation

```bash
npm install fractal-canopy
```

## Getting Started

### ESM / bundlers

```js
import { Canopy } from 'fractal-canopy';

const canvas = document.getElementById('canopy');
const ctx = canvas.getContext('2d');

const canopy = new Canopy(ctx);
canopy.RenderCanopy();
```

The package ships CommonJS and TypeScript types too, so `require('fractal-canopy')` and full autocomplete/type-checking both work out of the box.

### `<script>` tag / CDN

```html
<canvas id="canopy" height="400" width="800" style="background-color:#FFF;"></canvas>
<script src="https://cdn.jsdelivr.net/npm/fractal-canopy/dist/fractal-canopy.min.js"></script>
<!-- or: https://unpkg.com/fractal-canopy/dist/fractal-canopy.min.js -->
<script>
    var canvas = document.getElementById('canopy');
    var ctx = canvas.getContext('2d');

    var canopy = new FractalCanopy.Canopy(ctx);
    canopy.RenderCanopy();
</script>
```

> **Note:** as of `0.2.0` the browser build exposes a `FractalCanopy` namespace global (`FractalCanopy.Canopy`) instead of a bare `Canopy` global.

### Basic Usage

1. Create an instance of `Canopy`, passing in a canvas 2D context
2. Call `RenderCanopy()` on the Canopy object to draw the fractal canopy

### Options

`Canopy` takes an optional second argument to override any of the defaults.
Anything you leave out keeps its default value.

```js
const canopy = new Canopy(ctx, {
    originX: 200,
    originY: 400,
    maxDepth: 9,
    leafColor: 'Orange'
});
canopy.RenderCanopy();
```

| Option | Default | Description |
| --- | --- | --- |
| `originX` / `originY` | `400` / `400` | Point the trunk grows from |
| `startAngle` | `Math.PI` | Direction the trunk grows in, in radians |
| `trunkLength` / `trunkWidth` | `100` / `20` | Size of the trunk |
| `branchLength` / `branchWidth` | `75` / `20` | Size of the first pair of branches |
| `lengthScale` / `widthScale` | `0.75` / `0.6` | How much each branch shrinks per depth |
| `branchSpread` | `2π / 11` | Angle between a pair of branches, in radians |
| `spreadJitter` | `1` | Maximum random extra spread, in radians |
| `maxDepth` | `11` | How many times the canopy forks |
| `leafDepth` | `5` | Depth at which branches switch to the leaf colour |
| `branchColor` / `leafColor` | `'Black'` / `'Green'` | Stroke colours |
| `lineCap` | `'round'` | Canvas line cap. Round fills the joint where a branch forks; `'butt'` leaves a visible step |

The defaults are exposed as `Canopy.defaults`.

## Development

The library is written in TypeScript and built with [tsup](https://tsup.egoist.dev/), which emits ESM, CommonJS, a minified IIFE for `<script>`/CDN use, and `.d.ts` type declarations.

```bash
git clone https://github.com/nattrass/fractal-canopy.js.git
cd fractal-canopy.js
npm install
npm run build
```

- `npm run build` - Build ESM, CJS, IIFE and type declarations into `dist/`
- `npm run dev` - Rebuild on changes
- `npm run typecheck` - Type-check the project with `tsc --noEmit`

## Testing

This project uses [Vitest](https://vitest.dev/) for unit testing:

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with code coverage report

Test files are located in the `tests/` directory with the `.test.ts` extension.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

