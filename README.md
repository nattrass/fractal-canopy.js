# fractal-canopy.js

JavaScript library for rendering a [Fractal Canopy](https://en.wikipedia.org/wiki/Fractal_canopy) onto an HTML5 canvas.

![A Fractal Canopy](fractal-canopy.png)

## About

A fractal canopy is a fractal structure that resembles a tree canopy. This library provides an easy way to generate and display these beautiful recursive patterns on an HTML5 canvas.

## Prerequisites

- [Node.js](https://nodejs.org/) (for development and building)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nattrass/fractal-canopy.js.git
   cd fractal-canopy.js
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Getting Started

Include the `dist/fractal-canopy.js` file in your HTML and grab a 2D context from a canvas:

```html
<canvas id="canopy" height="400" width="800" style="background-color:#FFF;"></canvas>
<script src="dist/fractal-canopy.js"></script>
<script>
    var canvas = document.getElementById('canopy');
    var ctx = canvas.getContext('2d');

    var canopy = new Canopy(ctx);
    canopy.RenderCanopy();
</script>
```

### Basic Usage

1. Create an instance of `Canopy`, passing in a canvas 2D context
2. Call `RenderCanopy()` on the Canopy object to draw the fractal canopy

### Options

`Canopy` takes an optional second argument to override any of the defaults.
Anything you leave out keeps its default value.

```js
var canopy = new Canopy(ctx, {
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

The defaults are exposed as `Canopy.defaults`.

## Development

This project uses Grunt to automate build tasks:

- `npm run build` - Build the project (minified and unminified versions)
- `npm run watch` - Watch source files and rebuild on changes
- `npm run lint` - Lint JavaScript files

The Gruntfile.js contains all build configuration.

## Testing

This project uses Jest for unit testing:

- `npm test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with code coverage report

Test files are located in the `tests/` directory with the `.test.js` extension.

### Running Tests

After installing dependencies, you can run the test suite:

```bash
npm test
```

View code coverage:

```bash
npm run test:coverage
```

Watch mode for development (re-runs tests on file changes):

```bash
npm run test:watch
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

