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

## Development

This project uses Grunt to automate build tasks:

- `npm run build` - Build the project (minified and unminified versions)
- `npm run watch` - Watch source files and rebuild on changes
- `npm run lint` - Lint JavaScript files

The Gruntfile.js contains all build configuration.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

