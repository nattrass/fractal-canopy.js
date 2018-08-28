class Canopy {
    constructor(ctx) {
        this.ctx = ctx;
    }

    RenderCanopy() {
        let drawLine = function (x, y, length, angle, iterations, width) {
            count++;

            if (iterations >= 11) {
                return;
            }

            let leftRandomNumber = Math.floor((Math.random() * 2) + 1);
            let rightRandomNumber = Math.floor((Math.random() * 2) + 1);

            ctx.beginPath();
            ctx.lineWidth = width;
            ctx.moveTo(x, y);
            var leftangle = angle + (((2 * Math.PI / 11 + Math.random()) * 57.295779513082) / 2);
            var leftx = x + length * Math.sin(leftangle * 0.017453292519);
            var lefty = y + length * Math.cos(leftangle * 0.017453292519);
            ctx.lineTo(leftx, lefty);

            ctx.moveTo(x, y);

            var rightangle = angle - (((2 * Math.PI / 11 + Math.random()) * 57.295779513082) / 2);
            var rightx = x + length * Math.sin(rightangle * 0.017453292519);
            var righty = y + length * Math.cos(rightangle * 0.017453292519);
            ctx.lineTo(rightx, righty);

            if (iterations >= 5) {
                ctx.strokeStyle = 'Green';
            }
            else {
                ctx.strokeStyle = 'Black';
            }
            ctx.stroke();

            drawLine(leftx, lefty, length * 0.75, leftangle, iterations + 1, width * 0.6);
            drawLine(rightx, righty, length * 0.75, rightangle, iterations + 1, width * 0.6);

        };

        var count = 0;
        var startPoint = new Coordinate(400, 400);
        var length = 75;
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        startPoint.y = startPoint.y - 100;
        ctx.lineTo(startPoint.x, startPoint.y);
        ctx.lineWidth = 20;
        ctx.stroke();

        drawLine(startPoint.x, startPoint.y, length, 180, count, 20);
    }
}

