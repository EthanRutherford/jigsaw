import {Renderer, Scene, rgba, builtIn} from "2d-gl";
import {AABB, BVH} from "./framework/bvh";
import {Piece} from "./framework/piece";
import {makePeerCursor} from "./multiplayer/peer-cursor";
import {storeGame} from "./jigsaw-db";
import {randFloat, randInt, randChance} from "./random";
const {OrthoCamera} = builtIn;

export class PuzzleGame {
	constructor(ids, puzzle, pieces, savedPieces, canvas) {
		this.ids = ids;
		this.bvh = new BVH();

		// compute zoom bounds based on piece height and row count
		const h = puzzle.h / puzzle.w;
		const puzzleHeight = h * puzzle.r;
		this.minZoom = puzzleHeight / 5;
		this.maxZoom = puzzleHeight * 5;

		this.renderer = new Renderer(canvas);
		this.scene = new Scene({bgColor: rgba(.15, .15, .15, 1)});
		this.camera = new OrthoCamera(0, 0, puzzleHeight * 2);
		this.cursors = [];
		this.scene.getVisibleFunc = (x0, y0, x1, y1) => {
			const renderables = this.bvh.query(new AABB(x0, y0, x1, y1)).map((p) => p.renderable);
			if (this.mp == null) {
				return renderables;
			}

			const cursors = this.mp.getCursors();
			for (let i = 0; i < cursors.length; i++) {
				if (i === this.cursors.length) {
					this.cursors.push(makePeerCursor(this.renderer));
				}

				this.cursors[i].x = cursors[i].x;
				this.cursors[i].y = cursors[i].y;
				renderables.push(this.cursors[i]);
			}

			return renderables;
		};

		// shadows use a 1x1 texture, since they're a uniform color
		const shadow = document.createElement("canvas");
		shadow.width = 1;
		shadow.height = 1;
		const context = shadow.getContext("2d");
		context.globalAlpha = .25;
		context.fillRect(0, 0, 1, 1);

		// create pieces
		this.pieces = [];
		this.edgeCount = puzzle.c * 2 + puzzle.r * 2 - 4;
		for (let i = 0; i < puzzle.c; i++) {
			const isHorizontalEdge = i === 0 || i === puzzle.c - 1;
			for (let j = 0; j < puzzle.r; j++) {
				const id = i * puzzle.r + j;
				const coords = pieces[id];
				const isVerticalEdge = j === 0 || j === puzzle.r - 1;
				const isEdge = isHorizontalEdge || isVerticalEdge;

				const piece = new Piece(id, i, j, this.renderer, coords, puzzle, shadow, isEdge);

				this.pieces.push(piece);
				this.scene.add(piece.renderable);
			}
		}

		// setup pieces (possibly with saved positions)
		const groups = [];
		for (let id = 0; id < this.pieces.length; id++) {
			const piece = this.pieces[id];
			if (savedPieces[id] != null) {
				// restore saved data
				const saved = savedPieces[id];
				piece.x = saved.x;
				piece.y = saved.y;
				piece.orientation = saved.o;
				if (id !== saved.groupId) {
					const group = this.pieces[saved.groupId].group;
					group.pieces.add(piece);
					piece.group = group;
				} else {
					groups.push(piece.group);
				}

				// center the camera
				this.camera.x += piece.x / this.pieces.length;
				this.camera.y += piece.y / this.pieces.length;
			} else {
				// place pieces in random positions around a puzzle-sized hole
				const w = puzzle.c + 1;
				const hw = w / 2;
				const h = puzzle.r + 1;
				const hh = h / 2;
				if (randChance(.5)) {
					piece.x = randFloat(-w, w);
					piece.y = (randChance(.5) ? 1 : -1) * randFloat(hh, h);
				} else {
					piece.x = (randChance(.5) ? 1 : -1) * randFloat(hw, w);
					piece.y = randFloat(-h, h);
				}

				piece.orientation = randInt(0, 3);
				groups.push(piece.group);
			}
		}

		// insert groups of pieces into the bvh and init zIndex values and frozenness
		for (const group of groups) {
			this.tryFreezeGroup(group);

			let zIndex = 0;
			for (const piece of group.pieces) {
				const hits = this.bvh.insert(piece);
				for (const hit of hits) {
					if (!group.pieces.has(hit) && hit.zIndex > zIndex) {
						zIndex = hit.zIndex;
					}
				}
			}

			for (const piece of group.pieces) {
				piece.zIndex = zIndex + 2;
			}
		}

		this.animId = null;
		this.animLoop = this.animLoop.bind(this);
	}
	viewportToWorld(x, y) {
		return this.renderer.viewportToWorld(x, y, this.camera);
	}
	setZoom(zoom) {
		this.camera.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
	}
	setBgColor(c) {
		this.scene.bgColor = rgba(c.r / 255, c.g / 255, c.b / 255);
	}
	handlePointer(pos, piece) {
		if (this.mp != null) {
			this.mp.handlePointer(pos, piece);
		}
	}
	grabPieces(rootPiece, isLocal = true) {
		for (const piece of rootPiece.group.pieces) {
			piece.grabbed = true;
			piece.zIndex = 9999;
		}

		if (isLocal && this.mp != null) {
			this.mp.handleGrab(rootPiece);
		}
	}
	placePieces(rootPiece, isLocal = true) {
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
				if (error.x ** 2 + error.y ** 2 > .0625) {
					continue;
				}

				// success! snap to the larger group
				if (snapToPiece.group.size < other.group.size) {
					snapToPiece = other;
				}

				piece.group.join(other.group);
			}
		}

		// check for group freezing conditions
		this.tryFreezeGroup(rootPiece.group);

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
			piece.grabbed = false;
			piece.zIndex = zIndex + 2;
		}

		if (isLocal && this.mp != null) {
			this.mp.handleDrop(rootPiece);
		}
	}
	tryFreezeGroup(group) {
		const aPiece = group.pieces.values().next().value;
		if (!group.frozen && aPiece.orientation === 0) {
			let edgeCount = 0;
			for (const piece of group.pieces) {
				if (piece.isEdge) {
					edgeCount++;
				}
			}

			if (edgeCount === this.edgeCount) {
				group.frozen = true;
			}
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

		const hits = bvh.query(hitArea).filter((p) => p.hitTest(pos.x, pos.y));
		return hits.sort((a, b) => b.zIndex - a.zIndex)[0];
	}
	getPieces() {
		return this.pieces.map((p) => ({
			groupId: p.group.id,
			x: p.x,
			y: p.y,
			o: p.orientation,
		}));
	}
	async save() {
		if (this.ids != null) {
			await storeGame(this.ids.gameId, {
				imageId: this.ids.imageId,
				puzzleId: this.ids.puzzleId,
				pieces: this.getPieces(),
			});
		}
	}
	animLoop() {
		this.render();
		this.animId = requestAnimationFrame(this.animLoop);
	}
	stopLoop() {
		cancelAnimationFrame(this.animId);
		this.animId = null;
		if (this.mp != null) {
			this.mp.close();
		}
	}
	cleanup() {
		for (const piece of this.pieces) {
			piece.free();
		}

		this.renderer.free();
	}
	render() {
		this.renderer.render(this.camera, this.scene);
	}
}
