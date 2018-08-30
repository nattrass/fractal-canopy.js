# fractal-canopy.js

Javacript library providing the ability to render a [Fractal Canopy](https://en.wikipedia.org/wiki/Fractal_canopy) onto an HTML5 canvas.

![alt text](fractal-canopy.png "A Fractal Canopy")



## Getting Started

Include the dist/fractal-canopy.js file in your html, grab a 2d context from a canvas. 

    <canvas id="canopy" height="400" width="800" style="background-color:#FFF;"></canvas>
    <script src="dist/fractal-canopy.js"></script>
    <script>
        var canvas = document.getElementById('canopy');
        var ctx = canvas.getContext('2d');

        var canopy = new Canopy(ctx);
        canopy.RenderCanopy();
    </script>

Create an instance of Canopy, passing in a canvas context.

Call RenderCanopy() on the Canopy object.

## Prerequisites

The project uses NPM to manage packages and Grunt to automate build tasks.

## License

This project is licensed under the MIT License - see the [LICENSE](License) file for details

