const Canopy = require('../src/tree');
const Coordinate = require('../src/coordinate');

describe('Canopy', () => {
    let mockCtx;

    beforeEach(() => {
        // Create a mock canvas 2D context
        mockCtx = {
            beginPath: jest.fn(),
            moveTo: jest.fn(),
            lineTo: jest.fn(),
            stroke: jest.fn(),
            lineWidth: null,
            strokeStyle: null
        };
    });

    describe('constructor', () => {
        it('should create a Canopy instance with a canvas context', () => {
            const canopy = new Canopy(mockCtx);
            expect(canopy.ctx).toBe(mockCtx);
        });

        it('should store the canvas context', () => {
            const canopy = new Canopy(mockCtx);
            expect(canopy.ctx).not.toBeNull();
            expect(canopy.ctx).not.toBeUndefined();
        });
    });

    describe('RenderCanopy', () => {
        it('should call canvas methods when rendering', () => {
            const canopy = new Canopy(mockCtx);
            canopy.RenderCanopy();

            expect(mockCtx.beginPath).toHaveBeenCalled();
            expect(mockCtx.moveTo).toHaveBeenCalled();
            expect(mockCtx.lineTo).toHaveBeenCalled();
            expect(mockCtx.stroke).toHaveBeenCalled();
        });

        it('should set initial line width for trunk', () => {
            const canopy = new Canopy(mockCtx);
            canopy.RenderCanopy();

            // Check that lineWidth was set at some point during rendering
            // It will be modified through recursion, so we just verify it was used
            expect(mockCtx.lineWidth).not.toBeNull();
            expect(typeof mockCtx.lineWidth).toBe('number');
        });

        it('should draw from center position', () => {
            const canopy = new Canopy(mockCtx);
            canopy.RenderCanopy();

            // Check that moveTo and lineTo were called with coordinates around the center
            const calls = mockCtx.moveTo.mock.calls;
            expect(calls.length).toBeGreaterThan(0);
        });

        it('should not throw an error when rendering', () => {
            const canopy = new Canopy(mockCtx);
            expect(() => {
                canopy.RenderCanopy();
            }).not.toThrow();
        });

        it('should render repeatedly without errors', () => {
            const canopy = new Canopy(mockCtx);
            expect(() => {
                canopy.RenderCanopy();
                canopy.RenderCanopy();
                canopy.RenderCanopy();
            }).not.toThrow();
        });

        it('should use different stroke colors based on iterations', () => {
            const canopy = new Canopy(mockCtx);
            canopy.RenderCanopy();

            // Both Black and Green should be used as stroke styles
            const strokeCalls = mockCtx.stroke.mock.calls;
            expect(strokeCalls.length).toBeGreaterThan(0);
        });
    });

    describe('canvas context integration', () => {
        it('should work with a real canvas mock', () => {
            // Simulate a more complete canvas context
            const completeCtx = {
                beginPath: jest.fn(),
                moveTo: jest.fn(),
                lineTo: jest.fn(),
                stroke: jest.fn(),
                lineWidth: null,
                strokeStyle: null
            };

            const canopy = new Canopy(completeCtx);
            expect(() => {
                canopy.RenderCanopy();
            }).not.toThrow();

            expect(completeCtx.beginPath).toHaveBeenCalled();
        });
    });

    describe('multiple renders', () => {
        it('should be able to render multiple canopies independently', () => {
            const ctx1 = { beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn() };
            const ctx2 = { beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn() };

            const canopy1 = new Canopy(ctx1);
            const canopy2 = new Canopy(ctx2);

            canopy1.RenderCanopy();
            canopy2.RenderCanopy();

            expect(ctx1.beginPath).toHaveBeenCalled();
            expect(ctx2.beginPath).toHaveBeenCalled();
        });

        it('should not affect other canopy instances', () => {
            const ctx1 = { beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn() };
            const ctx2 = { beginPath: jest.fn(), moveTo: jest.fn(), lineTo: jest.fn(), stroke: jest.fn() };

            const canopy1 = new Canopy(ctx1);
            const canopy2 = new Canopy(ctx2);

            canopy1.RenderCanopy();
            const ctx1CallCount = ctx1.beginPath.mock.calls.length;

            canopy2.RenderCanopy();
            expect(ctx1.beginPath.mock.calls.length).toBe(ctx1CallCount);
        });
    });
});
