import { describe, it, expect } from 'vitest';
import { Coordinate } from '../src/coordinate';

describe('Coordinate', () => {
    describe('constructor', () => {
        it('should create a coordinate with x and y values', () => {
            const coord = new Coordinate(10, 20);
            expect(coord.x).toBe(10);
            expect(coord.y).toBe(20);
        });

        it('should handle zero coordinates', () => {
            const coord = new Coordinate(0, 0);
            expect(coord.x).toBe(0);
            expect(coord.y).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const coord = new Coordinate(-5, -15);
            expect(coord.x).toBe(-5);
            expect(coord.y).toBe(-15);
        });

        it('should handle decimal coordinates', () => {
            const coord = new Coordinate(3.14, 2.71);
            expect(coord.x).toBe(3.14);
            expect(coord.y).toBe(2.71);
        });

        it('should handle large coordinates', () => {
            const coord = new Coordinate(1000000, 2000000);
            expect(coord.x).toBe(1000000);
            expect(coord.y).toBe(2000000);
        });
    });

    describe('properties', () => {
        it('should allow modification of x coordinate', () => {
            const coord = new Coordinate(5, 10);
            coord.x = 15;
            expect(coord.x).toBe(15);
        });

        it('should allow modification of y coordinate', () => {
            const coord = new Coordinate(5, 10);
            coord.y = 25;
            expect(coord.y).toBe(25);
        });

        it('should allow independent modification of both coordinates', () => {
            const coord = new Coordinate(1, 2);
            coord.x = 100;
            coord.y = 200;
            expect(coord.x).toBe(100);
            expect(coord.y).toBe(200);
        });
    });

    describe('multiple instances', () => {
        it('should create independent coordinate instances', () => {
            const coord1 = new Coordinate(10, 20);
            const coord2 = new Coordinate(30, 40);
            expect(coord1.x).toBe(10);
            expect(coord2.x).toBe(30);
        });

        it('should not affect other instances when modifying one', () => {
            const coord1 = new Coordinate(5, 10);
            const coord2 = new Coordinate(5, 10);
            coord1.x = 100;
            expect(coord2.x).toBe(5);
        });
    });
});
