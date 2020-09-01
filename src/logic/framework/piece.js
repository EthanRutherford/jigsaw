import {builtIn} from "2d-gl";
const {Shape, SpriteMaterial} = builtIn;

const quickRotate = {
	0: (p) => p,
	1: (p) => ({x: -p.y, y: p.x}),
	2: (p) => ({x: -p.x, y: -p.y}),
	3: (p) => ({x: p.y, y: -p.x}),
};

class Group {
	constructor(parent) {
		this.id = parent.id;
		this.pieces = new Set([parent]);
		this.frozen = false;
	}
	join(other) {
		// the bigger group should eat the smaller group
		const [subsumer, subsumed] = this.size > other.size ? [this, other] : [other, this];

		subsumer.frozen = subsumer.frozen || subsumed.frozen;
		for (const piece of subsumed.pieces) {
			subsumer.pieces.add(piece);
			piece.group = subsumer;
		}
	}
	correctPositions(root) {
		for (const piece of this.pieces) {
			if (piece === root) continue;

			const correctPos = root.getConnectedPosition(piece);
			piece.x = correctPos.x;
			piece.y = correctPos.y;
		}
	}
	get size() {
		return this.pieces.size;
	}
}

export class Piece {
	constructor(id, x, y, renderer, {verts, tCoords}, puzzle, shadowImg, isEdge) {
		this.id = id;
		this.puzzleCoords = {x, y};
		this.w = 1;
		this.h = puzzle.h / puzzle.w;
		this.isEdge = isEdge;
		this.grabbed = false;

		const shape = new Shape(verts, Shape.triangles);

		const shadowMaterial = new SpriteMaterial(tCoords, shadowImg);
		const pieceMaterial = new SpriteMaterial(tCoords, puzzle.image, false);

		this.renderable = renderer.getInstance(shape, pieceMaterial);
		this.group = new Group(this);

		// attach shadow renderable as a child
		const shadow = renderer.getInstance(shape, shadowMaterial);
		this.renderable.getChildren = () => {
			const rotate = quickRotate[(4 - this.orientation) % 4];
			const offset = this.grabbed ? .1 : .05;
			const p = rotate({x: offset, y: -offset});
			shadow.x = p.x;
			shadow.y = p.y;
			shadow.zIndex = this.renderable.zIndex - 1;
			return [shadow];
		};

		// add free method
		this.free = () => {
			shape.free();
			shadowMaterial.free();
			pieceMaterial.free();
		};
	}
	get x() {return this.renderable.x;}
	set x(v) {return this.renderable.x = v;}
	get y() {return this.renderable.y;}
	set y(v) {return this.renderable.y = v;}
	get orientation() {
		return Math.round(this.renderable.r / Math.PI * 2);
	}
	set orientation(v) {
		this.renderable.r = v / 2 * Math.PI;
		return v;
	}
	get zIndex() {return this.renderable.zIndex;}
	set zIndex(v) {return this.renderable.zIndex = v;}
	isNeighbor(other) {
		const xDiff = Math.abs(this.puzzleCoords.x - other.puzzleCoords.x);
		const yDiff = Math.abs(this.puzzleCoords.y - other.puzzleCoords.y);

		// neighbors iff one offset is 0 and the other is 1
		return xDiff + yDiff === 1;
	}
	getConnectedPosition(other) {
		// assumes peices are both oriented correctly
		const offset = quickRotate[this.orientation]({
			x: (other.puzzleCoords.x - this.puzzleCoords.x) * this.w,
			y: -(other.puzzleCoords.y - this.puzzleCoords.y) * this.h,
		});

		return {
			x: this.x + offset.x,
			y: this.y + offset.y,
		};
	}
	moveTo(x, y) {
		this.x = x;
		this.y = y;
		this.group.correctPositions(this);
	}
	rotate(orientation) {
		// reorient pieces in group
		for (const piece of this.group.pieces) {
			piece.orientation = orientation;
		}

		this.group.correctPositions(this);
	}
}
