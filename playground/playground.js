(function () {
    'use strict';

    // One entry per CanopyOptions field. `type` drives which control is built;
    // range fields also need min/max/step. Order here is the order controls
    // appear in the panel.
    var optionDefs = [
        { key: 'originX', label: 'Origin X', type: 'range', min: 0, max: 800, step: 1 },
        { key: 'originY', label: 'Origin Y', type: 'range', min: 0, max: 400, step: 1 },
        { key: 'startAngle', label: 'Start angle (rad)', type: 'range', min: 0, max: 2 * Math.PI, step: 0.01 },
        { key: 'trunkLength', label: 'Trunk length', type: 'range', min: 0, max: 200, step: 1 },
        { key: 'trunkWidth', label: 'Trunk width', type: 'range', min: 1, max: 60, step: 1 },
        { key: 'branchLength', label: 'Branch length', type: 'range', min: 0, max: 200, step: 1 },
        { key: 'branchWidth', label: 'Branch width', type: 'range', min: 1, max: 60, step: 1 },
        { key: 'lengthScale', label: 'Length scale', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'widthScale', label: 'Width scale', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'branchSpread', label: 'Branch spread (rad)', type: 'range', min: 0, max: Math.PI, step: 0.01 },
        { key: 'spreadJitter', label: 'Spread jitter (rad)', type: 'range', min: 0, max: 3, step: 0.01 },
        { key: 'gravity', label: 'Gravity', type: 'range', min: -0.5, max: 1.5, step: 0.01 },
        { key: 'maxDepth', label: 'Max depth', type: 'range', min: 0, max: 20, step: 1 },
        { key: 'leafDepth', label: 'Leaf depth', type: 'range', min: 0, max: 20, step: 1 },
        { key: 'branchColor', label: 'Branch colour', type: 'color' },
        { key: 'leafColor', label: 'Leaf colour', type: 'color' },
        { key: 'lineCap', label: 'Line cap', type: 'select', options: ['round', 'butt', 'square'] }
    ];

    var canvas = document.getElementById('canopy');
    var ctx = canvas.getContext('2d');
    var form = document.getElementById('controls');
    var statusEl = document.getElementById('status');
    var fitNoticeEl = document.getElementById('fitNotice');
    var presetSelect = document.getElementById('preset');
    var controls = {};

    // ctx.fillStyle normalises any valid CSS colour (named, hex, rgb...) to
    // "#rrggbb" when read back, which is exactly what <input type="color"> needs.
    function toHex(color) {
        var probe = document.createElement('canvas').getContext('2d');
        probe.fillStyle = color;
        return probe.fillStyle;
    }

    function defaultsAsHex() {
        var defaults = FractalCanopy.Canopy.defaults;
        var copy = Object.assign({}, defaults);
        copy.branchColor = toHex(defaults.branchColor);
        copy.leafColor = toHex(defaults.leafColor);
        return copy;
    }

    function buildControls() {
        optionDefs.forEach(function (def) {
            var field = document.createElement('div');
            field.className = 'field';

            var label = document.createElement('label');
            label.htmlFor = def.key;
            label.textContent = def.label;
            field.appendChild(label);

            var input;
            if (def.type === 'select') {
                input = document.createElement('select');
                def.options.forEach(function (value) {
                    var opt = document.createElement('option');
                    opt.value = value;
                    opt.textContent = value;
                    input.appendChild(opt);
                });
            } else {
                input = document.createElement('input');
                input.type = def.type;
                if (def.type === 'range') {
                    input.min = def.min;
                    input.max = def.max;
                    input.step = def.step;

                    var output = document.createElement('output');
                    output.htmlFor = def.key;
                    field.appendChild(output);
                    controls[def.key] = { def: def, input: input, output: output };
                }
            }
            input.id = def.key;
            input.name = def.key;
            field.appendChild(input);
            form.appendChild(field);

            if (!controls[def.key]) {
                controls[def.key] = { def: def, input: input };
            }

            input.addEventListener('input', function () {
                syncOutput(def.key);
                scheduleRender();
            });
        });
    }

    function syncOutput(key) {
        var control = controls[key];
        if (control.output) {
            control.output.textContent = control.input.value;
        }
    }

    function applyOptions(options) {
        optionDefs.forEach(function (def) {
            controls[def.key].input.value = options[def.key];
            syncOutput(def.key);
        });
    }

    function readOptions() {
        var options = {};
        optionDefs.forEach(function (def) {
            var value = controls[def.key].input.value;
            options[def.key] = def.type === 'range' ? parseFloat(value) : value;
        });
        return options;
    }

    // Coalesce rapid slider drags (maxDepth in particular) into one render per frame.
    var renderQueued = false;
    function scheduleRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(function () {
            renderQueued = false;
            render();
        });
    }

    // The trunk grows upward from originY, so the headroom above it is exactly
    // originY pixels regardless of canvas size — long trunks/branches can push
    // the canopy above y=0 (or past the other edges). Rather than guess "safe"
    // slider ranges, work out the tree's actual bounding box every render (via
    // the public GrowBranches, so it's the same random tree we then draw) and
    // only scale/translate when it would otherwise be clipped. Draws identically
    // to Canopy.RenderCanopy() — this just wraps those same draw calls in a
    // transform, since RenderCanopy has no hook for one.
    var FIT_PADDING = 16;

    function computeBounds(base, crown, levels) {
        var minX = Math.min(base.x, crown.x);
        var maxX = Math.max(base.x, crown.x);
        var minY = Math.min(base.y, crown.y);
        var maxY = Math.max(base.y, crown.y);

        levels.forEach(function (level) {
            for (var i = 0; i < level.length; i += 4) {
                minX = Math.min(minX, level[i], level[i + 2]);
                maxX = Math.max(maxX, level[i], level[i + 2]);
                minY = Math.min(minY, level[i + 1], level[i + 3]);
                maxY = Math.max(maxY, level[i + 1], level[i + 3]);
            }
        });

        return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }

    function fitTransform(bounds) {
        var overflows = bounds.minX < 0 || bounds.minY < 0 || bounds.maxX > canvas.width || bounds.maxY > canvas.height;
        if (!overflows) {
            return { scale: 1, dx: 0, dy: 0 };
        }

        var boxW = Math.max(1, bounds.maxX - bounds.minX);
        var boxH = Math.max(1, bounds.maxY - bounds.minY);
        var scale = Math.min(1, (canvas.width - FIT_PADDING * 2) / boxW, (canvas.height - FIT_PADDING * 2) / boxH);

        return {
            scale: scale,
            dx: (canvas.width - boxW * scale) / 2 - bounds.minX * scale,
            dy: (canvas.height - boxH * scale) / 2 - bounds.minY * scale
        };
    }

    function drawCanopy(options, base, crown, levels) {
        ctx.lineCap = options.lineCap;

        ctx.beginPath();
        ctx.lineWidth = options.trunkWidth;
        ctx.strokeStyle = options.branchColor;
        ctx.moveTo(base.x, base.y);
        ctx.lineTo(crown.x, crown.y);
        ctx.stroke();

        for (var depth = 0; depth < levels.length; depth++) {
            ctx.beginPath();
            ctx.lineWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            ctx.strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            var level = levels[depth];
            for (var i = 0; i < level.length; i += 4) {
                ctx.moveTo(level[i], level[i + 1]);
                ctx.lineTo(level[i + 2], level[i + 3]);
            }
            ctx.stroke();
        }
    }

    function render() {
        var options = readOptions();
        var canopy = new FractalCanopy.Canopy(ctx, options);
        var base = { x: options.originX, y: options.originY };
        var crown = { x: base.x, y: base.y - options.trunkLength };
        var levels = canopy.GrowBranches(crown);

        var bounds = computeBounds(base, crown, levels);
        var transform = fitTransform(bounds);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.translate(transform.dx, transform.dy);
        ctx.scale(transform.scale, transform.scale);
        drawCanopy(options, base, crown, levels);
        ctx.restore();

        fitNoticeEl.textContent = transform.scale < 1
            ? 'Auto-fit: this canopy is bigger than the canvas, so it has been scaled down to stay fully visible.'
            : '';
    }

    function showStatus(message) {
        statusEl.textContent = message;
        clearTimeout(showStatus._t);
        showStatus._t = setTimeout(function () {
            statusEl.textContent = '';
        }, 2000);
    }

    function randomInRange(def) {
        var steps = Math.round((def.max - def.min) / def.step);
        var value = def.min + Math.floor(Math.random() * (steps + 1)) * def.step;
        var decimals = (String(def.step).split('.')[1] || '').length;
        return Number(value.toFixed(decimals));
    }

    function randomHex() {
        var value = Math.floor(Math.random() * 0xffffff);
        return '#' + value.toString(16).padStart(6, '0');
    }

    function randomise() {
        presetSelect.value = '';
        var options = {};
        optionDefs.forEach(function (def) {
            if (def.type === 'range') {
                options[def.key] = randomInRange(def);
            } else if (def.type === 'color') {
                options[def.key] = randomHex();
            } else if (def.type === 'select') {
                options[def.key] = def.options[Math.floor(Math.random() * def.options.length)];
            }
        });
        applyOptions(options);
        render();
        showStatus('Randomised');
    }

    function resetToDefaults() {
        presetSelect.value = '';
        applyOptions(defaultsAsHex());
        render();
        showStatus('Reset to defaults');
    }

    // "classicOak" -> "Classic Oak"
    function presetLabel(name) {
        return name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, function (c) {
            return c.toUpperCase();
        });
    }

    function buildPresetPicker() {
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Custom — pick a preset…';
        presetSelect.appendChild(placeholder);

        Object.keys(FractalCanopy.presets).forEach(function (name) {
            var opt = document.createElement('option');
            opt.value = name;
            opt.textContent = presetLabel(name);
            presetSelect.appendChild(opt);
        });

        presetSelect.addEventListener('change', function () {
            if (presetSelect.value) applyPreset(presetSelect.value);
        });
    }

    // Presets are partial CanopyOptions, same as what you'd hand to
    // `new FractalCanopy.Canopy(ctx, presets.x)`, so mirror that constructor's
    // own merge (defaults + preset) rather than layering onto whatever the
    // controls currently hold.
    function applyPreset(name) {
        var preset = FractalCanopy.presets[name];
        if (!preset) return;

        var merged = Object.assign({}, defaultsAsHex(), preset);
        if (preset.branchColor) merged.branchColor = toHex(preset.branchColor);
        if (preset.leafColor) merged.leafColor = toHex(preset.leafColor);

        applyOptions(merged);
        render();
        showStatus('Loaded preset: ' + presetLabel(name));
    }

    function downloadPng() {
        canvas.toBlob(function (blob) {
            var url = URL.createObjectURL(blob);
            var link = document.createElement('a');
            link.href = url;
            link.download = 'fractal-canopy.png';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showStatus('Downloaded fractal-canopy.png');
        }, 'image/png');
    }

    function formatConfigValue(def, value) {
        if (def.type === 'range') return value;
        return JSON.stringify(value);
    }

    function copyConfig() {
        var options = readOptions();
        var lines = optionDefs.map(function (def) {
            return '    ' + def.key + ': ' + formatConfigValue(def, options[def.key]) + ',';
        });
        var snippet = 'new FractalCanopy.Canopy(ctx, {\n' + lines.join('\n') + '\n});';

        var copyText = function () {
            return navigator.clipboard && navigator.clipboard.writeText
                ? navigator.clipboard.writeText(snippet)
                : Promise.reject(new Error('Clipboard API unavailable'));
        };

        copyText().catch(function () {
            var textarea = document.createElement('textarea');
            textarea.value = snippet;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }).then(function () {
            showStatus('Config copied to clipboard');
        }, function () {
            showStatus('Could not copy — see console');
            console.log(snippet);
        });
    }

    buildControls();
    buildPresetPicker();
    applyOptions(defaultsAsHex());
    render();

    document.getElementById('randomise').addEventListener('click', randomise);
    document.getElementById('reset').addEventListener('click', resetToDefaults);
    document.getElementById('download').addEventListener('click', downloadPng);
    document.getElementById('copy').addEventListener('click', copyConfig);
})();
