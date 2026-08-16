class Coordinate {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Coordinate;
}