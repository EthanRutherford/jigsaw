import {builtIn, rgba} from "2d-gl";
const {Shape, VectorMaterial} = builtIn;

const verts = [{x: 0, y: 0}, {x: .4, y: -.2}, {x: .2, y: -.4}];
const cursorShape = new Shape(verts, Shape.triangleStrip);
const outlineShape = new Shape(verts, Shape.lineLoop);
const outlineMaterial = new VectorMaterial([rgba(0, 0, 0), rgba(0, 0, 0), rgba(0, 0, 0)]);

export class PeerCursor {
	constructor(renderer, color) {
		this.color = color;
		const c = rgba(color.r / 255, color.g / 255, color.b / 255);
		this.material = new VectorMaterial([c, c, c]);

		this.renderable = renderer.getInstance(cursorShape, this.material);
		const outline = renderer.getInstance(outlineShape, outlineMaterial);
		this.renderable.getChildren = () => [outline];
		this.renderable.zIndex = 10000;
		outline.zIndex = 10001;
		this.free = () => {
			cursorShape.free();
			outlineShape.free();
			this.material.free();
			outlineMaterial.free();
		};
	}
	get x() {return this.renderable.x;}
	set x(v) {return this.renderable.x = v;}
	get y() {return this.renderable.y;}
	set y(v) {return this.renderable.y = v;}
	updateColor(color) {
		this.color = color;
		const c = rgba(color.r / 255, color.g / 255, color.b / 255);
		this.material.update([c, c, c]);
	}
}
