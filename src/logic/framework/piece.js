import {builtIn} from "2d-gl";
const {Shape, SpriteMaterial} = builtIn;

export class Piece {
	constructor(id, renderer, image, w, h) {
		this.id = id;
		this.w = 1;
		// this.h = h / w;
		this.h = 1;

		const shape = new Shape([
			{x: -this.w, y: -this.h},
			{x: this.w, y: -this.h},
			{x: this.w, y: this.h},
			{x: -this.w, y: this.h},
		]);

		const material = new SpriteMaterial(
			[{x: 0, y: 0}, {x: 1, y: 0}, {x: 1, y: 1}, {x: 0, y: 1}],
			image, false,
		);

		this.renderable = renderer.getInstance(shape, material);
	}
	get x() {return this.renderable.x;}
	set x(v) {return this.renderable.x = v;}
	get y() {return this.renderable.y;}
	set y(v) {return this.renderable.y = v;}
	get r() {return this.renderable.r;}
	set r(v) {return this.renderable.r = v;}
	get zIndex() {return this.renderable.zIndex;}
	set zIndex(v) {return this.renderable.zIndex = v;}
}
