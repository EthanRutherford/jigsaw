import {builtIn, rgba} from "2d-gl";
const {Shape, VectorMaterial} = builtIn;

const verts = [{x: 0, y: 0}, {x: .4, y: -.2}, {x: .2, y: -.4}];
const cursorShape = new Shape(verts, Shape.triangleStrip);
const cursorMaterial = new VectorMaterial([rgba(.8, .8, .8), rgba(.9, .9, .9), rgba(.9, .9, .9)]);
const outlineShape = new Shape(verts, Shape.lineLoop);
const outlineMaterial = new VectorMaterial([rgba(0, 0, 0), rgba(0, 0, 0), rgba(0, 0, 0)]);

export function makePeerCursor(renderer) {
	const root = renderer.getInstance(cursorShape, cursorMaterial);
	const outline = renderer.getInstance(outlineShape, outlineMaterial);
	root.getChildren = () => [outline];
	root.zIndex = 10000;
	outline.zIndex = 10001;
	return root;
}
