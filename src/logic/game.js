import {Renderer, Scene, rgba, builtIn} from "2d-gl";
import {AABB, BVH} from "./framework/bvh";
import {Piece} from "./framework/piece";
import {randFloat} from "./random";
const {OrthoCamera} = builtIn;

export class PuzzleGame {
	constructor(puzzle, canvas) {
		this.bvh = new BVH();

		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.1, .1, .1, 1)});
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

				const piece = new Piece(id, this.renderer, image, puzzle.w, puzzle.h);
				piece.x = randFloat(-10, 10);
				piece.y = randFloat(-10, 10);

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
	render() {
		this.renderer.render(this.camera, this.scene);
		requestAnimationFrame(this.render);
	}
}
