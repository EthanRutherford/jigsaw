import {Renderer, Scene, rgba, builtIn} from "2d-gl";
import {AABB, BVH} from "./framework/bvh";
import {Piece} from "./framework/piece";
import {randFloat, randInt, randChance} from "./random";
const {OrthoCamera} = builtIn;

export class PuzzleGame {
	constructor(puzzle, canvas) {
		this.bvh = new BVH();

		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.15, .15, .15, 1)});
		this.camera = new OrthoCamera(0, 0, 20);
		this.scene.getVisibleFunc = (x0, y0, x1, y1) => {
			return this.bvh.query(new AABB(x0, y0, x1, y1)).map((p) => p.renderable);
		};

		// create pieces
		this.pieces = [];
		for (let i = 0; i < puzzle.c; i++) {
			for (let j = 0; j < puzzle.r; j++) {
				const id = i * puzzle.r + j;
				const image = puzzle.drawPiece(i, j);

				const piece = new Piece(id, i, j, this.renderer, image, puzzle.w, puzzle.h);

				// place pieces in random positions around a puzzle-sized hole
				const w = puzzle.c;
				const hw = w / 2;
				const h = puzzle.r;
				const hh = h / 2;
				if (randChance(.5)) {
					piece.x = randFloat(-w, w);
					piece.y = (randChance(.5) ? 1 : -1) * randFloat(hh, h);
				} else {
					piece.x = (randChance(.5) ? 1 : -1) * randFloat(hw, w);
					piece.y = randFloat(-h, h);
				}

				piece.orientation = randInt(0, 3);

				this.pieces.push(piece);
				this.scene.add(piece.renderable);

				// insert into bounding volume hierarchy
				const hits = this.bvh.insert(piece);
				piece.zIndex = Math.max(0, ...hits.map((h) => h.zIndex)) + 1;
			}
		}

		// start render loop
		this.render = this.render.bind(this);
		this.render();
	}
	viewportToWorld(x, y) {
		return this.renderer.viewportToWorld(x, y, this.camera);
	}
	placePieces(rootPiece) {
		const {bvh} = this;

		let snapToPiece = rootPiece;
		for (const piece of rootPiece.group.pieces) {
			bvh.remove(piece);
			const hits = bvh.insert(piece);

			// check for connections
			const filtered = hits.filter((p) => !piece.group.pieces.has(p));
			for (const other of filtered) {
				// early exit if pieces aren't aligned neighbors
				if (
					piece.orientation !== other.orientation ||
					!piece.isNeighbor(other)
				) {
					continue;
				}

				// check if within snapping distance
				const correctPos = piece.getConnectedPosition(other);
				const error = {x: correctPos.x - other.x, y: correctPos.y - other.y};
				if (error.x ** 2 + error.y ** 2 > .04) {
					continue;
				}

				// success! snap to the larger group
				if (snapToPiece.group.size < other.group.size) {
					snapToPiece = other;
				}

				piece.group.join(other.group);
			}
		}

		// snap pieces in group to correct positions
		rootPiece.group.correctPositions(snapToPiece);

		// correct bvh nodes and zIndex values
		let zIndex = 0;
		for (const piece of rootPiece.group.pieces) {
			bvh.remove(piece);
			const hits = bvh.insert(piece);
			for (const hit of hits) {
				if (!piece.group.pieces.has(hit) && hit.zIndex > zIndex) {
					zIndex = hit.zIndex;
				}
			}
		}

		for (const piece of rootPiece.group.pieces) {
			piece.zIndex = zIndex + 1;
		}
	}
	query(pos) {
		const {camera, bvh} = this;

		const hitArea = new AABB(
			pos.x - camera.zoom / 200,
			pos.y - camera.zoom / 200,
			pos.x + camera.zoom / 200,
			pos.y + camera.zoom / 200,
		);

		const hits = bvh.query(hitArea).map((p) => ({
			piece: p,
			dist: (p.x - pos.x) ** 2 + (p.y - pos.y) ** 2,
		}));

		if (hits.length === 0) {
			return null;
		}

		return hits.sort((a, b) => {
			const distDiff = a.dist - b.dist;
			return Math.abs(distDiff < .04) ? b.piece.zIndex - a.piece.zIndex : distDiff;
		})[0].piece;
	}
	render() {
		this.renderer.render(this.camera, this.scene);
		requestAnimationFrame(this.render);
	}
}
