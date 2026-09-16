//#region src/version.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*
* The available versions of LifeHash.
*/
let Version = /* @__PURE__ */ function(Version) {
	/** DEPRECATED. Uses HSB gamut. Not CMYK-friendly. Has some minor gradient bugs. */
	Version[Version["version1"] = 0] = "version1";
	/** CMYK-friendly gamut. Recommended for most purposes. */
	Version[Version["version2"] = 1] = "version2";
	/** Double resolution. CMYK-friendly gamut. */
	Version[Version["detailed"] = 2] = "detailed";
	/** Optimized for generating machine-vision fiducials. High-contrast. CMYK-friendly gamut. */
	Version[Version["fiducial"] = 3] = "fiducial";
	/** Optimized for generating machine-vision fiducials. High-contrast. Grayscale. */
	Version[Version["grayscale_fiducial"] = 4] = "grayscale_fiducial";
	return Version;
}({});
//#endregion
//#region src/grid.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* A class that holds a 2-dimensional grid of values,
* and allows the reading, writing, and iteration through those values.
*/
var Grid = class Grid {
	width;
	height;
	storage;
	constructor(width, height, defaultValue) {
		this.width = width;
		this.height = height;
		this.storage = new Array(width * height).fill(defaultValue);
	}
	offset(x, y) {
		return y * this.width + x;
	}
	static circularIndex(index, modulus) {
		return (index % modulus + modulus) % modulus;
	}
	setAll(value) {
		this.storage.fill(value);
	}
	setValue(value, x, y) {
		this.storage[this.offset(x, y)] = value;
	}
	getValue(x, y) {
		return this.storage[this.offset(x, y)];
	}
	forAll(f) {
		for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) f(x, y);
	}
	forNeighborhood(px, py, f) {
		for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
			const nx = Grid.circularIndex(ox + px, this.width);
			const ny = Grid.circularIndex(oy + py, this.height);
			f(ox, oy, nx, ny);
		}
	}
};
//#endregion
//#region src/bit-enumerator.ts
/**
* A class that takes a block of data and returns its bits singularly or in clusters.
*/
var BitEnumerator = class {
	data;
	index = 0;
	mask = 128;
	constructor(data) {
		this.data = data;
	}
	hasNext() {
		return this.mask !== 0 || this.index !== this.data.length - 1;
	}
	next() {
		if (!this.hasNext()) throw new Error("BitEnumerator underflow");
		if (this.mask === 0) {
			this.mask = 128;
			this.index++;
		}
		const b = (this.data[this.index] & this.mask) !== 0;
		this.mask >>= 1;
		return b;
	}
	nextUint2() {
		let bitMask = 2;
		let value = 0;
		for (let i = 0; i < 2; i++) {
			if (this.next()) value |= bitMask;
			bitMask >>= 1;
		}
		return value;
	}
	nextUint8() {
		let bitMask = 128;
		let value = 0;
		for (let i = 0; i < 8; i++) {
			if (this.next()) value |= bitMask;
			bitMask >>= 1;
		}
		return value;
	}
	nextUint16() {
		let bitMask = 32768;
		let value = 0;
		for (let i = 0; i < 16; i++) {
			if (this.next()) value |= bitMask;
			bitMask >>= 1;
		}
		return value;
	}
	nextFrac() {
		return this.nextUint16() / 65535;
	}
	forAll(f) {
		while (this.hasNext()) f(this.next());
	}
};
/**
* A class that accumulates bits fed into it and returns a block of data containing those bits.
*/
var BitAggregator = class {
	_data = [];
	bitMask = 0;
	append(bit) {
		if (this.bitMask === 0) {
			this.bitMask = 128;
			this._data.push(0);
		}
		if (bit) this._data[this._data.length - 1] |= this.bitMask;
		this.bitMask >>= 1;
	}
	data() {
		return new Uint8Array(this._data);
	}
};
//#endregion
//#region src/cell-grid.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* A class that holds an array of boolean cells and that is
* capable of running Conway's Game of Life to produce the next generation.
*/
var CellGrid = class CellGrid {
	grid;
	constructor(width, height) {
		this.grid = new Grid(width, height, false);
	}
	static isAliveInNextGeneration(currentAlive, neighborsCount) {
		if (currentAlive) return neighborsCount === 2 || neighborsCount === 3;
		else return neighborsCount === 3;
	}
	countNeighbors(px, py) {
		let total = 0;
		this.grid.forNeighborhood(px, py, (ox, oy, nx, ny) => {
			if (ox === 0 && oy === 0) return;
			if (this.grid.getValue(nx, ny)) total++;
		});
		return total;
	}
	data() {
		const a = new BitAggregator();
		this.grid.forAll((x, y) => {
			a.append(this.grid.getValue(x, y));
		});
		return a.data();
	}
	setData(data) {
		const e = new BitEnumerator(data);
		let i = 0;
		e.forAll((b) => {
			this.grid.storage[i] = b;
			i++;
		});
	}
	nextGeneration(currentChangeGrid, nextCellGrid, nextChangeGrid) {
		nextCellGrid.grid.setAll(false);
		nextChangeGrid.grid.setAll(false);
		const width = this.grid.width;
		const height = this.grid.height;
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
			const currentAlive = this.grid.getValue(x, y);
			if (currentChangeGrid.grid.getValue(x, y)) {
				const neighborsCount = this.countNeighbors(x, y);
				const nextAlive = CellGrid.isAliveInNextGeneration(currentAlive, neighborsCount);
				if (nextAlive) nextCellGrid.grid.setValue(true, x, y);
				if (currentAlive !== nextAlive) nextChangeGrid.setChanged(x, y);
			} else nextCellGrid.grid.setValue(currentAlive, x, y);
		}
	}
};
//#endregion
//#region src/change-grid.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* A grid used to optimize the running of Conway's Game of Life by keeping
* track of cells that need consideration in the next generation, which
* allows the pruning of cells that don't need consideration.
*/
var ChangeGrid = class {
	grid;
	constructor(width, height) {
		this.grid = new Grid(width, height, false);
	}
	setChanged(px, py) {
		const width = this.grid.width;
		const height = this.grid.height;
		for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
			const nx = ((ox + px) % width + width) % width;
			const ny = ((oy + py) % height + height) % height;
			this.grid.setValue(true, nx, ny);
		}
	}
};
//#endregion
//#region src/frac-grid.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* A grid of floating point values in [0..1], used for onion-skinning
* the generations of the Game of Life into a single grayscale image.
*/
var FracGrid = class {
	grid;
	constructor(width, height) {
		this.grid = new Grid(width, height, 0);
	}
	overlay(cellGrid, frac) {
		const width = this.grid.width;
		const height = this.grid.height;
		for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (cellGrid.grid.getValue(x, y)) this.grid.setValue(frac, x, y);
	}
};
//#endregion
//#region src/color.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* Interpolate `t` from [0..1] to [a..b].
*/
function lerpTo(toA, toB, t) {
	return t * (toB - toA) + toA;
}
/**
* Interpolate `t` from [a..b] to [0..1].
*/
function lerpFrom(fromA, fromB, t) {
	return (fromA - t) / (fromA - fromB);
}
/**
* Interpolate `t` from [a..b] to [c..d].
*/
function lerp(fromA, fromB, toC, toD, t) {
	return lerpTo(toC, toD, lerpFrom(fromA, fromB, t));
}
function min(a, b, c) {
	if (c !== void 0) return Math.min(Math.min(a, b), c);
	return a < b ? a : b;
}
function max(a, b, c) {
	if (c !== void 0) return Math.max(Math.max(a, b), c);
	return a > b ? a : b;
}
/**
* Return `n` clamped to the range [0..1].
*/
function clamped(n) {
	return max(min(n, 1), 0);
}
/**
* Return `dividend` MODULO `divisor` where `dividend` can be negative,
* but the result is always non-negative.
*
* Round-trips through `f32` to mirror Rust's `(x as f32) % (y as f32)` —
* which the Rust crate uses to match the original C++ `fmodf`.
*/
const moduloF32 = /* @__PURE__ */ new Float32Array(1);
function toF32(x) {
	moduloF32[0] = x;
	return moduloF32[0];
}
function modulo(dividend, divisor) {
	const d = toF32(divisor);
	return toF32(toF32(toF32(toF32(dividend) % d) + d) % d);
}
/**
* A struct representing a color.
*/
var Color = class Color {
	r;
	g;
	b;
	constructor(r = 0, g = 0, b = 0) {
		this.r = r;
		this.g = g;
		this.b = b;
	}
	static white = new Color(1, 1, 1);
	static black = new Color(0, 0, 0);
	static red = new Color(1, 0, 0);
	static green = new Color(0, 1, 0);
	static blue = new Color(0, 0, 1);
	static cyan = new Color(0, 1, 1);
	static magenta = new Color(1, 0, 1);
	static yellow = new Color(1, 1, 0);
	/**
	* Create a Color from uint8 values [0..255].
	*/
	static fromUint8Values(r, g, b) {
		return new Color(r / 255, g / 255, b / 255);
	}
	/**
	* Linearly interpolate from this color to another.
	*/
	lerpTo(other, t) {
		const f = clamped(t);
		const red = clamped(this.r * (1 - f) + other.r * f);
		const green = clamped(this.g * (1 - f) + other.g * f);
		const blue = clamped(this.b * (1 - f) + other.b * f);
		return new Color(red, green, blue);
	}
	/**
	* Lighten this color by interpolating towards white.
	*/
	lighten(t) {
		return this.lerpTo(Color.white, t);
	}
	/**
	* Darken this color by interpolating towards black.
	*/
	darken(t) {
		return this.lerpTo(Color.black, t);
	}
	/**
	* Apply a burn effect to this color.
	*/
	burn(t) {
		const f = max(1 - t, 1e-7);
		return new Color(min(1 - (1 - this.r) / f, 1), min(1 - (1 - this.g) / f, 1), min(1 - (1 - this.b) / f, 1));
	}
	/**
	* Calculate the luminance of this color.
	*
	* Uses `f32`-precision multiplies/squares/sqrt to mirror Rust's
	* `as f32 → powi(2) → sqrt() → as f64`, which in turn mirrors the
	* original C++ `sqrtf`/`powf`.
	*/
	luminance() {
		const r = Math.fround(.299 * this.r);
		const g = Math.fround(.587 * this.g);
		const b = Math.fround(.114 * this.b);
		const r2 = Math.fround(r * r);
		const g2 = Math.fround(g * g);
		const b2 = Math.fround(b * b);
		const sum = Math.fround(Math.fround(r2 + g2) + b2);
		return Math.fround(Math.sqrt(sum));
	}
};
//#endregion
//#region src/patterns.ts
/**
* A function that takes a deterministic source of bits and selects a pattern
* used to add symmetry to a particular LifeHash version.
*/
function selectPattern(entropy, version) {
	switch (version) {
		case 3:
		case 4: return "fiducial";
		case 0:
		case 1:
		case 2: return entropy.next() ? "snowflake" : "pinwheel";
	}
}
//#endregion
//#region src/color-grid.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
const snowflakeTransforms = [
	{
		transpose: false,
		reflectX: false,
		reflectY: false
	},
	{
		transpose: false,
		reflectX: true,
		reflectY: false
	},
	{
		transpose: false,
		reflectX: false,
		reflectY: true
	},
	{
		transpose: false,
		reflectX: true,
		reflectY: true
	}
];
const pinwheelTransforms = [
	{
		transpose: false,
		reflectX: false,
		reflectY: false
	},
	{
		transpose: true,
		reflectX: true,
		reflectY: false
	},
	{
		transpose: true,
		reflectX: false,
		reflectY: true
	},
	{
		transpose: false,
		reflectX: true,
		reflectY: true
	}
];
const fiducialTransforms = [{
	transpose: false,
	reflectX: false,
	reflectY: false
}];
/**
* A class that takes a grayscale grid and applies color and
* symmetry to it to yield the finished LifeHash.
*/
var ColorGrid = class ColorGrid {
	grid;
	constructor(fracGrid, gradient, pattern) {
		const multiplier = pattern === "fiducial" ? 1 : 2;
		const targetWidth = fracGrid.grid.width * multiplier;
		const targetHeight = fracGrid.grid.height * multiplier;
		this.grid = new Grid(targetWidth, targetHeight, new Color());
		const maxX = targetWidth - 1;
		const maxY = targetHeight - 1;
		const transforms = ColorGrid.getTransforms(pattern);
		const fracWidth = fracGrid.grid.width;
		const fracHeight = fracGrid.grid.height;
		for (let y = 0; y < fracHeight; y++) for (let x = 0; x < fracWidth; x++) {
			const color = gradient(fracGrid.grid.getValue(x, y));
			for (const t of transforms) {
				let px = x;
				let py = y;
				if (t.transpose) [px, py] = [py, px];
				if (t.reflectX) px = maxX - px;
				if (t.reflectY) py = maxY - py;
				this.grid.setValue(color, px, py);
			}
		}
	}
	static getTransforms(pattern) {
		switch (pattern) {
			case "snowflake": return snowflakeTransforms;
			case "pinwheel": return pinwheelTransforms;
			case "fiducial": return fiducialTransforms;
		}
	}
	colors() {
		const result = [];
		for (const c of this.grid.storage) result.push(c.r, c.g, c.b);
		return result;
	}
};
//#endregion
//#region src/hsb-color.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* A struct representing a color in the HSB space.
* Only used by version1 LifeHashes.
*/
var HSBColor = class HSBColor {
	hue;
	saturation;
	brightness;
	constructor(hue, saturation = 1, brightness = 1) {
		this.hue = hue;
		this.saturation = saturation;
		this.brightness = brightness;
	}
	/**
	* Create an HSBColor from a hue alone, with saturation and brightness both set to 1.
	*/
	static fromHue(hue) {
		return new HSBColor(hue, 1, 1);
	}
	/**
	* Convert to RGB Color.
	*/
	color() {
		const v = clamped(this.brightness);
		const s = clamped(this.saturation);
		if (s <= 0) return new Color(v, v, v);
		let h = modulo(this.hue, 1);
		if (h < 0) h += 1;
		h *= 6;
		const i = Math.floor(Math.fround(h));
		const f = h - i;
		const p = v * (1 - s);
		const q = v * (1 - s * f);
		const t = v * (1 - s * (1 - f));
		switch (i) {
			case 0: return new Color(v, t, p);
			case 1: return new Color(q, v, p);
			case 2: return new Color(p, v, t);
			case 3: return new Color(p, q, v);
			case 4: return new Color(t, p, v);
			case 5: return new Color(v, p, q);
			default: throw new Error("Internal error in HSB conversion");
		}
	}
};
//#endregion
//#region src/color-func.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
/**
* Returns the reverse of the given color function.
*/
function reverse(c) {
	return (t) => c(1 - t);
}
/**
* Returns a color function that blends from one color to another.
*/
function blend2(color1, color2) {
	return (t) => color1.lerpTo(color2, t);
}
/**
* Returns a color function that blends through each of the given colors at equal intervals.
*/
function blend(colors) {
	const count = colors.length;
	switch (count) {
		case 0: return blend2(Color.black, Color.black);
		case 1: return blend2(colors[0], colors[0]);
		case 2: return blend2(colors[0], colors[1]);
		default: return (t) => {
			if (t >= 1) return colors[count - 1];
			else if (t <= 0) return colors[0];
			const s = t * (count - 1);
			const segment = Math.floor(s);
			const segmentFrac = modulo(s, 1);
			const c1 = colors[segment];
			const c2 = colors[segment + 1];
			return c1.lerpTo(c2, segmentFrac);
		};
	}
}
//#endregion
//#region src/gradients.ts
/**
* Copyright © 2023-2026 Blockchain Commons, LLC
* Copyright © 2025-2026 Parity Technologies
*
*/
function grayscale() {
	return blend2(Color.black, Color.white);
}
function selectGrayscale(entropy) {
	return entropy.next() ? grayscale() : reverse(grayscale());
}
function makeHue(t) {
	return HSBColor.fromHue(t).color();
}
function spectrum() {
	return blend([
		Color.fromUint8Values(0, 168, 222),
		Color.fromUint8Values(51, 51, 145),
		Color.fromUint8Values(233, 19, 136),
		Color.fromUint8Values(235, 45, 46),
		Color.fromUint8Values(253, 233, 43),
		Color.fromUint8Values(0, 158, 84),
		Color.fromUint8Values(0, 168, 222)
	]);
}
function spectrumCmykSafe() {
	return blend([
		Color.fromUint8Values(0, 168, 222),
		Color.fromUint8Values(41, 60, 130),
		Color.fromUint8Values(210, 59, 130),
		Color.fromUint8Values(217, 63, 53),
		Color.fromUint8Values(244, 228, 81),
		Color.fromUint8Values(0, 158, 84),
		Color.fromUint8Values(0, 168, 222)
	]);
}
function adjustForLuminance(color, contrastColor) {
	const lum = color.luminance();
	const contrastLum = contrastColor.luminance();
	const threshold = .6;
	const offset = Math.abs(lum - contrastLum);
	if (offset > threshold) return color;
	const t = lerp(0, threshold, .7, 0, offset);
	if (contrastLum > lum) return color.darken(t).burn(t * .6);
	else return color.lighten(t).burn(t * .6);
}
function monochromatic(entropy, hueGenerator) {
	const hue = entropy.nextFrac();
	const isTint = entropy.next();
	const isReversed = entropy.next();
	const keyAdvance = entropy.nextFrac() * .3 + .05;
	const neutralAdvance = entropy.nextFrac() * .3 + .05;
	let keyColor = hueGenerator(hue);
	let contrastBrightness;
	if (isTint) {
		contrastBrightness = 1;
		keyColor = keyColor.darken(.5);
	} else contrastBrightness = 0;
	const neutralColor = grayscale()(contrastBrightness);
	const gradient = blend2(keyColor.lerpTo(neutralColor, keyAdvance), neutralColor.lerpTo(keyColor, neutralAdvance));
	return isReversed ? reverse(gradient) : gradient;
}
function monochromaticFiducial(entropy) {
	const hue = entropy.nextFrac();
	const isReversed = entropy.next();
	const contrastColor = entropy.next() ? Color.white : Color.black;
	const keyColor = adjustForLuminance(spectrumCmykSafe()(hue), contrastColor);
	const gradient = blend([
		keyColor,
		contrastColor,
		keyColor
	]);
	return isReversed ? reverse(gradient) : gradient;
}
function complementary(entropy, hueGenerator) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + .5, 1);
	const lighterAdvance = entropy.nextFrac() * .3;
	const darkerAdvance = entropy.nextFrac() * .3;
	const isReversed = entropy.next();
	const color1 = hueGenerator(spectrum1);
	const color2 = hueGenerator(spectrum2);
	const luma1 = color1.luminance();
	const luma2 = color2.luminance();
	let darkerColor;
	let lighterColor;
	if (luma1 > luma2) {
		darkerColor = color2;
		lighterColor = color1;
	} else {
		darkerColor = color1;
		lighterColor = color2;
	}
	const adjustedLighterColor = lighterColor.lighten(lighterAdvance);
	const gradient = blend2(darkerColor.darken(darkerAdvance), adjustedLighterColor);
	return isReversed ? reverse(gradient) : gradient;
}
function complementaryFiducial(entropy) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + .5, 1);
	const isTint = entropy.next();
	const isReversed = entropy.next();
	const neutralColorBias = entropy.next();
	const neutralColor = isTint ? Color.white : Color.black;
	const spec = spectrumCmykSafe();
	const color1 = spec(spectrum1);
	const color2 = spec(spectrum2);
	const biasedNeutralColor = neutralColor.lerpTo(neutralColorBias ? color1 : color2, .2).burn(.1);
	const gradient = blend([
		adjustForLuminance(color1, biasedNeutralColor),
		biasedNeutralColor,
		adjustForLuminance(color2, biasedNeutralColor)
	]);
	return isReversed ? reverse(gradient) : gradient;
}
function triadic(entropy, hueGenerator) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + 1 / 3, 1);
	const spectrum3 = modulo(spectrum1 + 2 / 3, 1);
	const lighterAdvance = entropy.nextFrac() * .3;
	const darkerAdvance = entropy.nextFrac() * .3;
	const isReversed = entropy.next();
	const colors = [
		hueGenerator(spectrum1),
		hueGenerator(spectrum2),
		hueGenerator(spectrum3)
	].sort((a, b) => a.luminance() - b.luminance());
	const darkerColor = colors[0];
	const middleColor = colors[1];
	const gradient = blend([
		colors[2].lighten(lighterAdvance),
		middleColor,
		darkerColor.darken(darkerAdvance)
	]);
	return isReversed ? reverse(gradient) : gradient;
}
function triadicFiducial(entropy) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + 1 / 3, 1);
	const spectrum3 = modulo(spectrum1 + 2 / 3, 1);
	const isTint = entropy.next();
	const neutralInsertIndex = entropy.nextUint8() % 2 + 1;
	const isReversed = entropy.next();
	const neutralColor = isTint ? Color.white : Color.black;
	const spec = spectrumCmykSafe();
	const colors = [
		spec(spectrum1),
		spec(spectrum2),
		spec(spectrum3)
	];
	switch (neutralInsertIndex) {
		case 1:
			colors[0] = adjustForLuminance(colors[0], neutralColor);
			colors[1] = adjustForLuminance(colors[1], neutralColor);
			colors[2] = adjustForLuminance(colors[2], colors[1]);
			break;
		case 2:
			colors[1] = adjustForLuminance(colors[1], neutralColor);
			colors[2] = adjustForLuminance(colors[2], neutralColor);
			colors[0] = adjustForLuminance(colors[0], colors[1]);
			break;
		default: throw new Error("Internal error");
	}
	colors.splice(neutralInsertIndex, 0, neutralColor);
	const gradient = blend(colors);
	return isReversed ? reverse(gradient) : gradient;
}
function analogous(entropy, hueGenerator) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + 1 / 12, 1);
	const spectrum3 = modulo(spectrum1 + 2 / 12, 1);
	const spectrum4 = modulo(spectrum1 + 3 / 12, 1);
	const advance = entropy.nextFrac() * .5 + .2;
	const isReversed = entropy.next();
	const color1 = hueGenerator(spectrum1);
	const color2 = hueGenerator(spectrum2);
	const color3 = hueGenerator(spectrum3);
	const color4 = hueGenerator(spectrum4);
	let darkestColor;
	let darkColor;
	let lightColor;
	let lightestColor;
	if (color1.luminance() < color4.luminance()) {
		darkestColor = color1;
		darkColor = color2;
		lightColor = color3;
		lightestColor = color4;
	} else {
		darkestColor = color4;
		darkColor = color3;
		lightColor = color2;
		lightestColor = color1;
	}
	const gradient = blend([
		darkestColor.darken(advance),
		darkColor.darken(advance / 2),
		lightColor.lighten(advance / 2),
		lightestColor.lighten(advance)
	]);
	return isReversed ? reverse(gradient) : gradient;
}
function analogousFiducial(entropy) {
	const spectrum1 = entropy.nextFrac();
	const spectrum2 = modulo(spectrum1 + 1 / 10, 1);
	const spectrum3 = modulo(spectrum1 + 2 / 10, 1);
	const isTint = entropy.next();
	const neutralInsertIndex = entropy.nextUint8() % 2 + 1;
	const isReversed = entropy.next();
	const neutralColor = isTint ? Color.white : Color.black;
	const spec = spectrumCmykSafe();
	const colors = [
		spec(spectrum1),
		spec(spectrum2),
		spec(spectrum3)
	];
	switch (neutralInsertIndex) {
		case 1:
			colors[0] = adjustForLuminance(colors[0], neutralColor);
			colors[1] = adjustForLuminance(colors[1], neutralColor);
			colors[2] = adjustForLuminance(colors[2], colors[1]);
			break;
		case 2:
			colors[1] = adjustForLuminance(colors[1], neutralColor);
			colors[2] = adjustForLuminance(colors[2], neutralColor);
			colors[0] = adjustForLuminance(colors[0], colors[1]);
			break;
		default: throw new Error("Internal error");
	}
	colors.splice(neutralInsertIndex, 0, neutralColor);
	const gradient = blend(colors);
	return isReversed ? reverse(gradient) : gradient;
}
/**
* A function that takes a deterministic source of bits and selects a gradient
* used to color a particular LifeHash version.
*/
function selectGradient(entropy, version) {
	if (version === 4) return selectGrayscale(entropy);
	switch (entropy.nextUint2()) {
		case 0: switch (version) {
			case 0: return monochromatic(entropy, makeHue);
			case 1:
			case 2: return monochromatic(entropy, spectrumCmykSafe());
			case 3: return monochromaticFiducial(entropy);
			default: return grayscale();
		}
		case 1: switch (version) {
			case 0: return complementary(entropy, spectrum());
			case 1:
			case 2: return complementary(entropy, spectrumCmykSafe());
			case 3: return complementaryFiducial(entropy);
			default: return grayscale();
		}
		case 2: switch (version) {
			case 0: return triadic(entropy, spectrum());
			case 1:
			case 2: return triadic(entropy, spectrumCmykSafe());
			case 3: return triadicFiducial(entropy);
			default: return grayscale();
		}
		case 3: switch (version) {
			case 0: return analogous(entropy, spectrum());
			case 1:
			case 2: return analogous(entropy, spectrumCmykSafe());
			case 3: return analogousFiducial(entropy);
			default: return grayscale();
		}
		default: return grayscale();
	}
}
//#endregion
//#region ../bc-crypto-ts/node_modules/@noble/hashes/_u64.js
const fromNumH = (n) => n / 2 ** 32 | 0;
const fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
	const h = fromNumH(n);
	const l = fromNumL(n);
	view.setUint32(byteOffset, isLE ? l : h, isLE);
	view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}
//#endregion
//#region ../bc-crypto-ts/node_modules/@noble/hashes/utils.js
/**
* Checks if something is Uint8Array. Be careful: nodejs Buffer will return true.
* @param a - value to test
* @returns `true` when the value is a Uint8Array-compatible view.
* @example
* Check whether a value is a Uint8Array-compatible view.
* ```ts
* isBytes(new Uint8Array([1, 2, 3]));
* ```
*/
function isBytes(a) {
	return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
const atitle = (title) => title ? `"${title}" ` : "";
/**
* Asserts something is a non-negative integer.
* @param n - number to validate
* @param title - label included in thrown errors
* @returns The validated number.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a non-negative integer option.
* ```ts
* anumber(32, 'length');
* ```
*/
function anumber(n, title = "") {
	if (typeof n !== "number") throw new TypeError(atitle(title) + "expected number, got " + typeof n);
	if (!Number.isSafeInteger(n) || n < 0) throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
	return n;
}
/**
* Asserts something is Uint8Array.
* @param value - value to validate
* @param length - optional exact length constraint
* @param title - label included in thrown errors
* @returns The validated byte array.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate that a value is a byte array.
* ```ts
* abytes(new Uint8Array([1, 2, 3]));
* ```
*/
function abytes(value, length, title = "") {
	if (isBytes(value) && (length === void 0 || value.length === length)) return value;
	if (length !== void 0) anumber(length, "length");
	const bytes = isBytes(value);
	const ofLen = length !== void 0 ? ` of length ${length}` : "";
	const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
	const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
	if (!bytes) throw new TypeError(message);
	throw new RangeError(message);
}
const aobject = (value, label) => {
	if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
const aopts = (value, label) => {
	aobject(value, label);
	const proto = Object.getPrototypeOf(value);
	if (proto !== Object.prototype && proto !== null) throw new TypeError(`"${label}" expected plain object`);
	if (Object.hasOwn(value, "__proto__")) throw new TypeError(`"${label}.__proto__" is not allowed`);
};
/**
* Asserts a hash instance has not been destroyed or finished.
* @param instance - hash instance to validate
* @param checkFinished - whether to reject finalized instances
* @throws If the hash instance has already been destroyed or finalized. {@link Error}
* @example
* Validate that a hash instance is still usable.
* ```ts
* import { aexists } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aexists(hash);
* ```
*/
function aexists(instance, checkFinished = true) {
	if (instance.destroyed) throw new Error("hash was destroyed");
	if (checkFinished && instance.finished) throw new Error("digest() was already called");
}
/**
* Asserts output is a sufficiently-sized byte array.
* @param out - destination buffer
* @param instance - hash instance providing output length
* Oversized buffers are allowed; downstream code only promises to fill the first `outputLen` bytes.
* @throws On wrong argument types. {@link TypeError}
* @throws On wrong argument ranges or values. {@link RangeError}
* @example
* Validate a caller-provided digest buffer.
* ```ts
* import { aoutput } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const hash = sha256.create();
* aoutput(new Uint8Array(hash.outputLen), hash);
* ```
*/
function aoutput(out, instance) {
	abytes(out, void 0, "output");
	const min = instance.outputLen;
	if (!(out.length >= min)) throw new RangeError("\"output\" expected length >= " + min);
}
/**
* Zeroizes typed arrays in place. Warning: JS provides no guarantees.
* @param arrays - arrays to overwrite with zeros
* @example
* Zeroize sensitive buffers in place.
* ```ts
* clean(new Uint8Array([1, 2, 3]));
* ```
*/
function clean(...arrays) {
	for (let i = 0; i < arrays.length; i++) arrays[i].fill(0);
}
/**
* Creates a DataView for byte-level manipulation.
* @param arr - source typed array
* @returns DataView over the same buffer region.
* @example
* Create a DataView over an existing buffer.
* ```ts
* createView(new Uint8Array(4));
* ```
*/
function createView(arr) {
	return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
/**
* Rotate-right operation for uint32 values.
* @param word - source word
* @param shift - shift amount in bits
* @returns Rotated word.
* @example
* Rotate a 32-bit word to the right.
* ```ts
* rotr(0x12345678, 8);
* ```
*/
function rotr(word, shift) {
	return word << 32 - shift | word >>> shift;
}
/**
* Merges default options and passed options.
* @param defaults - base option object
* @param opts - user overrides
* @param title - label included in thrown override errors
* @returns Fresh merged option object with a null prototype.
* @throws On wrong argument types. {@link TypeError}
* @example
* Merge user overrides onto default options.
* ```ts
* checkOpts({ dkLen: 32 }, { asyncTick: 10 });
* ```
*/
function checkOpts(defaults, opts, title = "opts") {
	aopts(defaults, "defaults");
	if (opts !== void 0) aopts(opts, title);
	return Object.assign(Object.create(null), defaults, opts);
}
/**
* Creates a callable hash function from a stateful class constructor.
* @param hashCons - hash constructor or factory
* @param info - optional metadata such as DER OID
* @returns Frozen callable hash wrapper with `.create()`.
*   Wrapper construction eagerly calls `hashCons(undefined)` once to read
*   `outputLen` / `blockLen`, so constructor side effects happen at module
*   init time.
* @throws On wrong argument types. {@link TypeError}
* @example
* Wrap a stateful hash constructor into a callable helper.
* ```ts
* import { createHasher } from '@noble/hashes/utils.js';
* import { sha256 } from '@noble/hashes/sha2.js';
* const wrapped = createHasher(sha256.create, { oid: sha256.oid });
* wrapped(new Uint8Array([1]));
* ```
*/
function createHasher(hashCons, info = {}) {
	if (typeof hashCons !== "function") throw new TypeError("\"hashCons\" expected function, got type=" + typeof hashCons);
	info = checkOpts({}, info, "info");
	const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
	const tmp = hashCons(void 0);
	hashC.outputLen = tmp.outputLen;
	hashC.blockLen = tmp.blockLen;
	hashC.canXOF = tmp.canXOF;
	hashC.create = (opts) => hashCons(opts);
	Object.assign(hashC, info);
	return Object.freeze(hashC);
}
/**
* Creates OID metadata for NIST hashes with prefix `06 09 60 86 48 01 65 03 04 02`.
* @param suffix - final OID byte for the selected hash.
*   The helper accepts any byte even though only the documented NIST hash
*   suffixes are meaningful downstream.
* @returns Object containing the DER-encoded OID.
* @example
* Build OID metadata for a NIST hash.
* ```ts
* oidNist(0x01);
* ```
*/
const oidNist = (suffix) => ({ oid: Uint8Array.from([
	6,
	9,
	96,
	134,
	72,
	1,
	101,
	3,
	4,
	2,
	suffix
]) });
//#endregion
//#region ../bc-crypto-ts/node_modules/@noble/hashes/_md.js
/**
* Internal Merkle-Damgard hash utils.
* @module
*/
/**
* Shared 32-bit conditional boolean primitive reused by SHA-256, SHA-1, and MD5 `F`.
* Returns bits from `b` when `a` is set, otherwise from `c`.
* The XOR form is equivalent to MD5's `F(X,Y,Z) = XY v not(X)Z` because the masked terms never
* set the same bit.
* @param a - selector word
* @param b - word chosen when selector bit is set
* @param c - word chosen when selector bit is clear
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit choice primitive.
* ```ts
* Chi(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Chi(a, b, c) {
	return a & b ^ ~a & c;
}
/**
* Shared 32-bit majority primitive reused by SHA-256 and SHA-1.
* Returns bits shared by at least two inputs.
* @param a - first input word
* @param b - second input word
* @param c - third input word
* @returns Mixed 32-bit word.
* @example
* Combine three words with the shared 32-bit majority primitive.
* ```ts
* Maj(0xffffffff, 0x12345678, 0x87654321);
* ```
*/
function Maj(a, b, c) {
	return a & b ^ a & c ^ b & c;
}
/**
* Merkle-Damgard hash construction base class.
* Could be used to create MD5, RIPEMD, SHA1, SHA2.
* Accepts only byte-aligned `Uint8Array` input, even when the underlying spec describes bit
* strings with partial-byte tails.
* @param blockLen - internal block size in bytes
* @param outputLen - digest size in bytes
* @param padOffset - trailing length field size in bytes
* @param isLE - whether length and state words are encoded in little-endian
* @example
* Use a concrete subclass to get the shared Merkle-Damgard update/digest flow.
* ```ts
* import { _SHA1 } from '@noble/hashes/legacy.js';
* const hash = new _SHA1();
* hash.update(new Uint8Array([97, 98, 99]));
* hash.digest();
* ```
*/
var HashMD = class {
	blockLen;
	outputLen;
	canXOF = false;
	padOffset;
	isLE;
	buffer;
	view;
	finished = false;
	length = 0;
	pos = 0;
	destroyed = false;
	constructor(blockLen, outputLen, padOffset, isLE) {
		this.blockLen = blockLen;
		this.outputLen = outputLen;
		this.padOffset = padOffset;
		this.isLE = isLE;
		this.buffer = new Uint8Array(blockLen);
		this.view = createView(this.buffer);
	}
	update(data) {
		aexists(this);
		abytes(data);
		const { view, buffer, blockLen } = this;
		const len = data.length;
		let processed = false;
		for (let pos = 0; pos < len;) {
			const take = Math.min(blockLen - this.pos, len - pos);
			if (take === blockLen) {
				const dataView = createView(data);
				for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
				processed = true;
				continue;
			}
			buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
			this.pos += take;
			pos += take;
			if (this.pos === blockLen) {
				this.process(view, 0);
				this.pos = 0;
				processed = true;
			}
		}
		this.length += data.length;
		if (processed) this.roundClean();
		return this;
	}
	digestInto(out) {
		aexists(this);
		aoutput(out, this);
		this.finished = true;
		const { buffer, view, blockLen, isLE } = this;
		let { pos } = this;
		buffer[pos++] = 128;
		buffer.fill(0, pos);
		if (this.padOffset > blockLen - pos) {
			this.process(view, 0);
			buffer.fill(0);
		}
		setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
		this.process(view, 0);
		this.roundClean();
		const oview = out === buffer ? view : createView(out);
		const len = this.outputLen;
		const outLen = len / 4;
		const state = this.get();
		if (len % 4 || outLen > state.length) throw new Error("invalid outputLen");
		for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
	}
	digest() {
		const { buffer, outputLen } = this;
		this.digestInto(buffer);
		const res = buffer.slice(0, outputLen);
		this.destroy();
		return res;
	}
	_cloneIntoMeta(to) {
		const { buffer, length, finished, destroyed, pos } = this;
		to.destroyed = destroyed;
		to.finished = finished;
		to.length = length;
		to.pos = pos;
		if (pos) to.buffer.set(buffer);
		return to;
	}
	clone() {
		return this._cloneInto();
	}
};
/**
* Initial SHA-2 state: fractional parts of square roots of first 16 primes 2..53.
* Check out `test/misc/sha2-gen-iv.js` for recomputation guide.
*/
/** Initial SHA256 state from RFC 6234 §6.1: the first 32 bits of the fractional parts of the
* square roots of the first eight prime numbers. Exported as a shared table; callers must treat
* it as read-only because constructors copy words from it by index. */
const SHA256_IV = /* @__PURE__ */ Uint32Array.from([
	1779033703,
	3144134277,
	1013904242,
	2773480762,
	1359893119,
	2600822924,
	528734635,
	1541459225
]);
//#endregion
//#region ../bc-crypto-ts/node_modules/@noble/hashes/sha2.js
/**
* SHA2 hash function. A.k.a. sha256, sha384, sha512, sha512_224, sha512_256.
* SHA256 is the fastest hash implementable in JS, even faster than Blake3.
* Check out {@link https://www.rfc-editor.org/rfc/rfc4634 | RFC 4634} and
* {@link https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.180-4.pdf | FIPS 180-4}.
* @module
*/
/**
* SHA-224 / SHA-256 round constants from RFC 6234 §5.1: the first 32 bits
* of the cube roots of the first 64 primes (2..311).
*/
const SHA256_K = /* @__PURE__ */ Uint32Array.from([
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
]);
/** Reusable SHA-224 / SHA-256 message schedule buffer `W_t` from RFC 6234 §6.2 step 1. */
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
/** Internal SHA-224 / SHA-256 compression engine from RFC 6234 §6.2. */
var SHA2_32B = class extends HashMD {
	A = 0;
	B = 0;
	C = 0;
	D = 0;
	E = 0;
	F = 0;
	G = 0;
	H = 0;
	constructor(outputLen, IV) {
		super(64, outputLen, 8, false);
		this.A = IV[0] | 0;
		this.B = IV[1] | 0;
		this.C = IV[2] | 0;
		this.D = IV[3] | 0;
		this.E = IV[4] | 0;
		this.F = IV[5] | 0;
		this.G = IV[6] | 0;
		this.H = IV[7] | 0;
	}
	get() {
		const { A, B, C, D, E, F, G, H } = this;
		return [
			A,
			B,
			C,
			D,
			E,
			F,
			G,
			H
		];
	}
	set(A, B, C, D, E, F, G, H) {
		this.A = A | 0;
		this.B = B | 0;
		this.C = C | 0;
		this.D = D | 0;
		this.E = E | 0;
		this.F = F | 0;
		this.G = G | 0;
		this.H = H | 0;
	}
	_cloneInto(to) {
		(to ||= new this.constructor()).set(...this.get());
		return this._cloneIntoMeta(to);
	}
	process(view, offset) {
		for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
		for (let i = 16; i < 64; i++) {
			const W15 = SHA256_W[i - 15];
			const W2 = SHA256_W[i - 2];
			const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
			const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
			SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
		}
		let { A, B, C, D, E, F, G, H } = this;
		for (let i = 0; i < 64; i++) {
			const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
			const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
			const T2 = (rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22)) + Maj(A, B, C) | 0;
			H = G;
			G = F;
			F = E;
			E = D + T1 | 0;
			D = C;
			C = B;
			B = A;
			A = T1 + T2 | 0;
		}
		A = A + this.A | 0;
		B = B + this.B | 0;
		C = C + this.C | 0;
		D = D + this.D | 0;
		E = E + this.E | 0;
		F = F + this.F | 0;
		G = G + this.G | 0;
		H = H + this.H | 0;
		this.set(A, B, C, D, E, F, G, H);
	}
	roundClean() {
		clean(SHA256_W);
	}
	destroy() {
		this.destroyed = true;
		this.set(0, 0, 0, 0, 0, 0, 0, 0);
		clean(this.buffer);
	}
};
/** Internal SHA-256 hash class grounded in RFC 6234 §6.2. */
var _SHA256 = class extends SHA2_32B {
	constructor() {
		super(32, SHA256_IV);
	}
};
/**
* SHA2-256 hash function from RFC 4634. In JS it's the fastest: even faster than Blake3. Some info:
*
* - Trying 2^128 hashes would get 50% chance of collision, using birthday attack.
* - BTC network is doing 2^70 hashes/sec (2^95 hashes/year) as per 2025.
* - Each sha256 hash is executing 2^18 bit operations.
* - Good 2024 ASICs can do 200Th/sec with 3500 watts of power, corresponding to 2^36 hashes/joule.
* @param msg - message bytes to hash
* @param opts - Reserved hash options.
* @returns Digest bytes.
* @example
* Hash a message with SHA2-256.
* ```ts
* sha256(new Uint8Array([97, 98, 99]));
* ```
*/
const sha256$1 = /* @__PURE__ */ createHasher(() => new _SHA256(), /* @__PURE__ */ oidNist(1));
//#endregion
//#region ../bc-crypto-ts/tests/baseline/crypto-baseline.mjs
const CRC32_TABLE = /* @__PURE__ */ new Uint32Array(256);
for (let i = 0; i < 256; i++) {
	let crc = i;
	for (let j = 0; j < 8; j++) crc = (crc & 1) !== 0 ? crc >>> 1 ^ 3988292384 : crc >>> 1;
	CRC32_TABLE[i] = crc >>> 0;
}
/**
* Calculate SHA-256 hash
*/
function sha256(data) {
	return sha256$1(data);
}
//#endregion
//#region src/hex.ts
const HEX_CHARS = "0123456789abcdef";
function byteToHex(byte) {
	return HEX_CHARS[byte >> 4 & 15] + HEX_CHARS[byte & 15];
}
/**
* Convert data to a hex string.
*/
function dataToHex(data) {
	let result = "";
	for (const c of data) result += byteToHex(c);
	return result;
}
//#endregion
//#region src/format-utils.ts
/**
* Convert the given UTF-8 string to a block of data.
*/
function toData(utf8) {
	return new TextEncoder().encode(utf8);
}
//#endregion
//#region src/lib.ts
function makeImage(width, height, floatColors, moduleSize, hasAlpha) {
	if (!Number.isInteger(moduleSize) || moduleSize <= 0) throw new Error("Invalid module size");
	const scaledWidth = width * moduleSize;
	const scaledHeight = height * moduleSize;
	const resultComponents = hasAlpha ? 4 : 3;
	const scaledCapacity = scaledWidth * scaledHeight * resultComponents;
	const resultColors = new Uint8Array(scaledCapacity);
	for (let targetY = 0; targetY < scaledWidth; targetY++) for (let targetX = 0; targetX < scaledHeight; targetX++) {
		const sourceX = Math.floor(targetX / moduleSize);
		const sourceOffset = (Math.floor(targetY / moduleSize) * width + sourceX) * 3;
		const targetOffset = (targetY * scaledWidth + targetX) * resultComponents;
		resultColors[targetOffset] = Math.trunc(clamped(floatColors[sourceOffset]) * 255);
		resultColors[targetOffset + 1] = Math.trunc(clamped(floatColors[sourceOffset + 1]) * 255);
		resultColors[targetOffset + 2] = Math.trunc(clamped(floatColors[sourceOffset + 2]) * 255);
		if (hasAlpha) resultColors[targetOffset + 3] = 255;
	}
	return {
		width: scaledWidth,
		height: scaledHeight,
		colors: resultColors
	};
}
/**
* Make a LifeHash from a UTF-8 string, which may be of any length.
* The caller is responsible to ensure that the string has undergone any
* necessary Unicode normalization in order to produce consistent results.
*/
function makeFromUtf8(s, version = 1, moduleSize = 1, hasAlpha = false) {
	return makeFromData(toData(s), version, moduleSize, hasAlpha);
}
/**
* Make a LifeHash from given data, which may be of any size.
*/
function makeFromData(data, version = 1, moduleSize = 1, hasAlpha = false) {
	return makeFromDigest(sha256(data), version, moduleSize, hasAlpha);
}
/**
* Make a LifeHash from the SHA256 digest of some other data.
* The digest must be exactly 32 pseudorandom bytes. This is the base
* LifeHash creation algorithm, but if you don't already have a SHA256 hash of
* some data, then you should access it by calling `makeFromData()`. If you
* are starting with a UTF-8 string, call `makeFromUtf8()`.
*/
function makeFromDigest(digest, version = 1, moduleSize = 1, hasAlpha = false) {
	if (digest.length !== 32) throw new Error("Digest must be 32 bytes");
	let length;
	let maxGenerations;
	switch (version) {
		case 0:
		case 1:
			length = 16;
			maxGenerations = 150;
			break;
		case 2:
		case 3:
		case 4:
			length = 32;
			maxGenerations = 300;
			break;
		default: throw new Error("Invalid version");
	}
	let currentCellGrid = new CellGrid(length, length);
	let nextCellGrid = new CellGrid(length, length);
	let currentChangeGrid = new ChangeGrid(length, length);
	let nextChangeGrid = new ChangeGrid(length, length);
	const historySet = /* @__PURE__ */ new Set();
	const history = [];
	switch (version) {
		case 0:
			nextCellGrid.setData(new Uint8Array(digest));
			break;
		case 1:
			nextCellGrid.setData(sha256(new Uint8Array(digest)));
			break;
		case 2:
		case 3:
		case 4: {
			let digest1 = new Uint8Array(digest);
			if (version === 4) digest1 = sha256(digest1);
			const digest2 = sha256(digest1);
			const digest3 = sha256(digest2);
			const digest4 = sha256(digest3);
			const digestFinal = /* @__PURE__ */ new Uint8Array(128);
			digestFinal.set(digest1, 0);
			digestFinal.set(digest2, 32);
			digestFinal.set(digest3, 64);
			digestFinal.set(digest4, 96);
			nextCellGrid.setData(digestFinal);
			break;
		}
	}
	nextChangeGrid.grid.setAll(true);
	while (history.length < maxGenerations) {
		[currentCellGrid, nextCellGrid] = [nextCellGrid, currentCellGrid];
		[currentChangeGrid, nextChangeGrid] = [nextChangeGrid, currentChangeGrid];
		const data = currentCellGrid.data();
		const hashHex = dataToHex(sha256(data));
		if (historySet.has(hashHex)) break;
		historySet.add(hashHex);
		history.push(data);
		currentCellGrid.nextGeneration(currentChangeGrid, nextCellGrid, nextChangeGrid);
	}
	const fracGrid = new FracGrid(length, length);
	for (let i = 0; i < history.length; i++) {
		currentCellGrid.setData(history[i]);
		const frac = clamped(lerpFrom(0, history.length, i + 1));
		fracGrid.overlay(currentCellGrid, frac);
	}
	if (version !== 0) {
		let minValue = Infinity;
		let maxValue = -Infinity;
		fracGrid.grid.forAll((x, y) => {
			const value = fracGrid.grid.getValue(x, y);
			minValue = min(minValue, value);
			maxValue = max(maxValue, value);
		});
		fracGrid.grid.forAll((x, y) => {
			const value = lerpFrom(minValue, maxValue, fracGrid.grid.getValue(x, y));
			fracGrid.grid.setValue(value, x, y);
		});
	}
	const entropy = new BitEnumerator(new Uint8Array(digest));
	switch (version) {
		case 2:
			entropy.next();
			break;
		case 1: entropy.nextUint2();
	}
	const colorGrid = new ColorGrid(fracGrid, selectGradient(entropy, version), selectPattern(entropy, version));
	return makeImage(colorGrid.grid.width, colorGrid.grid.height, colorGrid.colors(), moduleSize, hasAlpha);
}
//#endregion
export { Version, makeFromData, makeFromDigest, makeFromUtf8 };
