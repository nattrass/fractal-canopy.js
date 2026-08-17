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
        { key: 'branchiness', label: 'Branchiness', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'apicalDominance', label: 'Apical dominance', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'branchCurve', label: 'Branch curve', type: 'range', min: 0, max: 1, step: 0.01 },
        { key: 'massWeightedWidth', label: 'Mass-weighted width', type: 'boolean' },
        { key: 'maxDepth', label: 'Max depth', type: 'range', min: 0, max: 20, step: 1 },
        { key: 'leafDepth', label: 'Leaf depth', type: 'range', min: 0, max: 20, step: 1 },
        { key: 'leafStyle', label: 'Leaf style', type: 'select', options: ['line', 'cluster'] },
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
    var seedInput = document.getElementById('seed');
    var controls = {};

    // ctx.fillStyle normalises any valid CSS colour (named, hex, rgb...) to
    // "#rrggbb" when read back, which is exactly what <input type="color"> needs.
    // Assigning an invalid string leaves fillStyle unchanged rather than
    // throwing, so this also doubles as a safe way to validate colours coming
    // from an untrusted source (e.g. a pasted URL hash).
    function toHex(color) {
        var probe = document.createElement('canvas').getContext('2d');
        probe.fillStyle = color;
        return probe.fillStyle;
    }

    function hexifyOptions(options) {
        var copy = Object.assign({}, options);
        copy.branchColor = toHex(options.branchColor);
        copy.leafColor = toHex(options.leafColor);
        return copy;
    }

    function defaultsAsHex() {
        return hexifyOptions(FractalCanopy.Canopy.defaults);
    }

    // What the current tree should be compared against to decide what's worth
    // putting in the URL: the preset's own resolved values if one is selected
    // (so picking a preset and changing nothing produces just "#preset=x"),
    // otherwise the library defaults.
    function currentBaseline() {
        var name = presetSelect.value;
        if (name && FractalCanopy.presets[name]) {
            return hexifyOptions(Object.assign({}, FractalCanopy.Canopy.defaults, FractalCanopy.presets[name]));
        }
        return defaultsAsHex();
    }

    function generateSeed() {
        return Math.random().toString(36).slice(2, 10);
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
                input.type = def.type === 'boolean' ? 'checkbox' : def.type;
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

    // The single place that pushes an options-like object into every control,
    // seed included, so every code path that changes the tree (presets,
    // randomise, reset, loading a shared URL) stays in sync the same way.
    function applyOptions(options) {
        optionDefs.forEach(function (def) {
            if (def.type === 'boolean') {
                controls[def.key].input.checked = !!options[def.key];
            } else {
                controls[def.key].input.value = options[def.key];
            }
            syncOutput(def.key);
        });
        seedInput.value = options.seed !== undefined && options.seed !== null ? String(options.seed) : '';
    }

    function readOptions() {
        var options = {};
        optionDefs.forEach(function (def) {
            if (def.type === 'boolean') {
                options[def.key] = controls[def.key].input.checked;
                return;
            }
            var value = controls[def.key].input.value;
            options[def.key] = def.type === 'range' ? parseFloat(value) : value;
        });
        var seedValue = seedInput.value.trim();
        if (seedValue !== '') {
            options.seed = seedValue;
        }
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
    // only scale/translate when it would otherwise be clipped.
    //
    // drawCanopy below deliberately mirrors Canopy.RenderCanopy() in
    // src/tree.ts branch-for-branch (including the CURVE_BOW_FRACTION/
    // LEAF_BLOB_* constants and hashToUnit helper) rather than calling it
    // directly, because RenderCanopy always calls GrowBranches again itself —
    // using it here would consume a second, separately-jittered tree for
    // drawing than the one bounds were computed from. Keep the two in sync by
    // hand if tree.ts's rendering ever changes.
    var FIT_PADDING = 16;
    var CURVE_BOW_FRACTION = 0.26;
    var LEAF_BLOBS_MIN = 2;
    var LEAF_BLOBS_RANGE = 2;
    var LEAF_BLOB_MIN_RADIUS = 2;
    var LEAF_BLOB_RADIUS_RANGE = 3;
    var LEAF_BLOB_SPREAD = 6;

    function hashToUnit(n) {
        var x = Math.sin(n) * 43758.5453123;
        return x - Math.floor(x);
    }

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

    // branchCurve/leafStyle:'cluster' can both draw outside a segment's own
    // straight-line endpoints (a curve's bow, a leaf blob's scatter radius),
    // so pad the raw geometric bounds conservatively before checking for
    // overflow — an approximation, not pixel-exact, but errs toward more
    // padding than needed rather than clipping a blob or curve at the edge.
    function boundsMargin(options) {
        var margin = 0;
        if (options.branchCurve > 0) {
            margin = Math.max(margin, options.branchCurve * Math.max(options.trunkLength, options.branchLength) * CURVE_BOW_FRACTION);
        }
        if (options.leafStyle === 'cluster') {
            margin = Math.max(margin, LEAF_BLOB_SPREAD + LEAF_BLOB_MIN_RADIUS + LEAF_BLOB_RADIUS_RANGE);
        }
        return margin;
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

    // x1,y1 -> x2,y2 as either a straight line (branchCurve 0, the default)
    // or a gentle quadratic bow, alternating direction between adjacent
    // branches via `variant` (consecutive entries in a level are the +1/-1
    // direction siblings from GrowBranches). Mirrors Canopy's private
    // drawSegment exactly. Assumes x1,y1 is already the current point
    // (moveTo'd by the caller).
    function drawSegment(x1, y1, x2, y2, variant, branchCurve) {
        if (branchCurve === 0) {
            ctx.lineTo(x2, y2);
            return;
        }

        var dx = x2 - x1;
        var dy = y2 - y1;
        var length = Math.hypot(dx, dy) || 1;
        var sign = (variant / 4) % 2 === 0 ? 1 : -1;
        var bow = branchCurve * length * CURVE_BOW_FRACTION * sign;
        var midX = (x1 + x2) / 2 + (-dy / length) * bow;
        var midY = (y1 + y2) / 2 + (dx / length) * bow;

        ctx.quadraticCurveTo(midX, midY, x2, y2);
    }

    // Default path: every branch at a depth shares a width and colour, so
    // each depth is stroked as a single path rather than one path per branch.
    function drawLevelsUniform(options, levels) {
        for (var depth = 0; depth < levels.length; depth++) {
            ctx.beginPath();
            ctx.lineWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            ctx.strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            var level = levels[depth];
            for (var i = 0; i < level.length; i += 4) {
                ctx.moveTo(level[i], level[i + 1]);
                drawSegment(level[i], level[i + 1], level[i + 2], level[i + 3], i, options.branchCurve);
            }
            ctx.stroke();
        }
    }

    // massWeightedWidth: one stroke per branch instead, so each branch's
    // width can reflect its own actual length (via apicalDominance) rather
    // than a single depth-wide value.
    function drawLevelsMassWeighted(options, levels) {
        for (var depth = 0; depth < levels.length; depth++) {
            var level = levels[depth];
            var nominalLength = options.branchLength * Math.pow(options.lengthScale, depth);
            var baseWidth = options.branchWidth * Math.pow(options.widthScale, depth);
            var strokeStyle = depth >= options.leafDepth ? options.leafColor : options.branchColor;

            for (var i = 0; i < level.length; i += 4) {
                var x1 = level[i];
                var y1 = level[i + 1];
                var x2 = level[i + 2];
                var y2 = level[i + 3];
                var actualLength = Math.hypot(x2 - x1, y2 - y1);
                var widthFactor = nominalLength > 0 ? actualLength / nominalLength : 1;

                ctx.beginPath();
                ctx.lineWidth = baseWidth * widthFactor;
                ctx.strokeStyle = strokeStyle;
                ctx.moveTo(x1, y1);
                drawSegment(x1, y1, x2, y2, i, options.branchCurve);
                ctx.stroke();
            }
        }
    }

    // A small filled cluster near each outermost tip, layered on top of the
    // ordinary coloured twigs. Only applies to the deepest level actually
    // grown, and only if that level would already be drawn in leafColor.
    function drawLeafClusters(options, levels) {
        if (levels.length === 0 || levels.length - 1 < options.leafDepth) {
            return;
        }

        var tips = levels[levels.length - 1];
        ctx.fillStyle = options.leafColor;

        for (var i = 0; i < tips.length; i += 4) {
            var tipX = tips[i + 2];
            var tipY = tips[i + 3];
            var tipSeed = tipX * 12.9898 + tipY * 78.233;
            var blobCount = LEAF_BLOBS_MIN + Math.floor(hashToUnit(tipSeed) * (LEAF_BLOBS_RANGE + 1));

            for (var b = 0; b < blobCount; b++) {
                var angle = hashToUnit(tipSeed + b * 17.31 + 1.1) * Math.PI * 2;
                var dist = hashToUnit(tipSeed + b * 17.31 + 2.2) * LEAF_BLOB_SPREAD;
                var radius = LEAF_BLOB_MIN_RADIUS + hashToUnit(tipSeed + b * 17.31 + 3.3) * LEAF_BLOB_RADIUS_RANGE;

                ctx.beginPath();
                ctx.arc(tipX + Math.cos(angle) * dist, tipY + Math.sin(angle) * dist, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    function drawCanopy(options, base, crown, levels) {
        ctx.lineCap = options.lineCap;

        ctx.beginPath();
        ctx.lineWidth = options.trunkWidth;
        ctx.strokeStyle = options.branchColor;
        ctx.moveTo(base.x, base.y);
        drawSegment(base.x, base.y, crown.x, crown.y, 0, options.branchCurve);
        ctx.stroke();

        if (options.massWeightedWidth) {
            drawLevelsMassWeighted(options, levels);
        } else {
            drawLevelsUniform(options, levels);
        }

        if (options.leafStyle === 'cluster') {
            drawLeafClusters(options, levels);
        }
    }

    function render() {
        var options = readOptions();
        var canopy = new FractalCanopy.Canopy(ctx, options);
        var base = { x: options.originX, y: options.originY };
        var crown = { x: base.x, y: base.y - options.trunkLength };
        var levels = canopy.GrowBranches(crown);

        var bounds = computeBounds(base, crown, levels);
        var margin = boundsMargin(options);
        bounds.minX -= margin;
        bounds.maxX += margin;
        bounds.minY -= margin;
        bounds.maxY += margin;
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

        updateHash();
    }

    function valuesDiffer(def, currentRaw, baselineRaw) {
        if (def.type === 'range') {
            // A range input silently rounds to the nearest step when its value
            // is set programmatically (e.g. Math.PI -> "3.14" on a step=0.01
            // slider), so the control's displayed value and the raw library
            // default can differ by up to half a step without the user having
            // touched anything. Tolerate that; only a real change — at least
            // one whole step away — should count as "differs".
            var tolerance = def.step / 2 + 1e-9;
            return Math.abs(parseFloat(currentRaw) - parseFloat(baselineRaw)) > tolerance;
        }
        return String(currentRaw) !== String(baselineRaw);
    }

    // Only what differs from the baseline (defaults, or the selected preset's
    // own values) goes in the URL, so an unmodified preset link is just
    // "#preset=name&seed=..." rather than restating every option.
    function buildHashParams() {
        var params = new URLSearchParams();
        var presetName = presetSelect.value;
        var baseline = currentBaseline();

        if (presetName) {
            params.set('preset', presetName);
        }

        optionDefs.forEach(function (def) {
            var current = def.type === 'boolean' ? controls[def.key].input.checked : controls[def.key].input.value;
            if (valuesDiffer(def, current, baseline[def.key])) {
                params.set(def.key, String(current));
            }
        });

        var seedValue = seedInput.value.trim();
        if (seedValue !== '') {
            params.set('seed', seedValue);
        }

        return params;
    }

    // Keeps the address bar in sync without adding a history entry per slider
    // tick (replaceState, not pushState/location.hash) and without the
    // scroll-to-anchor jump a real hash navigation would cause.
    function updateHash() {
        var hash = buildHashParams().toString();
        var url = location.pathname + location.search + (hash ? '#' + hash : '');
        history.replaceState(null, '', url);
    }

    // Parses location.hash into an options object and applies it. Invalid or
    // unrecognised values are skipped individually (falling back to the
    // relevant baseline value) rather than aborting the whole thing, so a
    // partially malformed hash still renders something sensible instead of
    // throwing. Returns false (and touches nothing) if there's no usable state
    // in the hash at all, so the caller can fall back to plain defaults.
    function applyStateFromHash() {
        var raw = location.hash.replace(/^#/, '');
        if (!raw) return false;

        var params;
        try {
            params = new URLSearchParams(raw);
        } catch (e) {
            return false;
        }

        var presetName = params.get('preset');
        var hasPreset = !!(presetName && FractalCanopy.presets[presetName]);
        var baseline = hasPreset
            ? hexifyOptions(Object.assign({}, FractalCanopy.Canopy.defaults, FractalCanopy.presets[presetName]))
            : defaultsAsHex();

        var options = Object.assign({}, baseline);
        var appliedAny = hasPreset;

        optionDefs.forEach(function (def) {
            if (!params.has(def.key)) return;
            var value = params.get(def.key);

            if (def.type === 'range') {
                var num = parseFloat(value);
                if (Number.isFinite(num)) {
                    options[def.key] = num;
                    appliedAny = true;
                }
            } else if (def.type === 'select') {
                if (def.options.indexOf(value) !== -1) {
                    options[def.key] = value;
                    appliedAny = true;
                }
            } else if (def.type === 'color') {
                options[def.key] = toHex(value);
                appliedAny = true;
            } else if (def.type === 'boolean') {
                options[def.key] = value === 'true';
                appliedAny = true;
            }
        });

        var seedParam = params.get('seed');
        if (seedParam !== null && seedParam !== '') {
            options.seed = seedParam;
            appliedAny = true;
        }

        if (!appliedAny) return false;

        presetSelect.value = hasPreset ? presetName : '';
        applyOptions(options);
        render();
        return true;
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

    // Randomising sets a concrete seed rather than leaving it blank (which
    // would fall back to Math.random and reshuffle on every re-render), so
    // whatever it lands on is reproducible and shareable, not one-off.
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
            } else if (def.type === 'boolean') {
                options[def.key] = Math.random() < 0.5;
            }
        });
        options.seed = generateSeed();
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
    // controls currently hold. Also sets a seed, so a shared preset link
    // reproduces the exact tree rather than a fresh random one each visit.
    function applyPreset(name) {
        var preset = FractalCanopy.presets[name];
        if (!preset) return;

        var merged = hexifyOptions(Object.assign({}, FractalCanopy.Canopy.defaults, preset));
        merged.seed = generateSeed();

        applyOptions(merged);
        render();
        showStatus('Loaded preset: ' + presetLabel(name));
    }

    function newSeed() {
        var options = readOptions();
        options.seed = generateSeed();
        applyOptions(options);
        render();
        showStatus('New seed: ' + options.seed);
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

    function copyTextToClipboard(text, successMessage) {
        var copyText = function () {
            return navigator.clipboard && navigator.clipboard.writeText
                ? navigator.clipboard.writeText(text)
                : Promise.reject(new Error('Clipboard API unavailable'));
        };

        copyText().catch(function () {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }).then(function () {
            showStatus(successMessage);
        }, function () {
            showStatus('Could not copy — see console');
            console.log(text);
        });
    }

    function copyConfig() {
        var options = readOptions();
        var lines = optionDefs.map(function (def) {
            return '    ' + def.key + ': ' + formatConfigValue(def, options[def.key]) + ',';
        });
        if (options.seed !== undefined) {
            lines.push('    seed: ' + JSON.stringify(options.seed) + ',');
        }
        var snippet = 'new FractalCanopy.Canopy(ctx, {\n' + lines.join('\n') + '\n});';
        copyTextToClipboard(snippet, 'Config copied to clipboard');
    }

    // The primary share action: the address bar is already kept live in sync
    // with the current tree (see updateHash), so this just needs to copy it.
    function copyLink() {
        copyTextToClipboard(location.href, 'Link copied to clipboard');
    }

    buildControls();
    buildPresetPicker();
    if (!applyStateFromHash()) {
        applyOptions(defaultsAsHex());
        render();
    }

    document.getElementById('randomise').addEventListener('click', randomise);
    document.getElementById('reset').addEventListener('click', resetToDefaults);
    document.getElementById('download').addEventListener('click', downloadPng);
    document.getElementById('copy').addEventListener('click', copyConfig);
    document.getElementById('copyLink').addEventListener('click', copyLink);
    document.getElementById('newSeed').addEventListener('click', newSeed);
    seedInput.addEventListener('input', scheduleRender);
})();
