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
	render() {
		this.renderer.render(this.camera, this.scene);
		requestAnimationFrame(this.render);
	}
}
