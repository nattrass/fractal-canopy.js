import { defineConfig } from 'tsup';

export default defineConfig([
    {
        entry: { 'fractal-canopy': 'src/index.ts' },
        format: ['esm', 'cjs'],
        dts: true,
        sourcemap: true,
        clean: true,
        outDir: 'dist'
    },
    {
        entry: { 'fractal-canopy': 'src/index.ts' },
        format: ['iife'],
        globalName: 'FractalCanopy',
        minify: true,
        sourcemap: true,
        outDir: 'dist',
        outExtension: () => ({ js: '.min.js' })
    }
]);
