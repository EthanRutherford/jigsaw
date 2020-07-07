import React, {useRef, useEffect} from "react";
import {AABB} from "../logic/framework/bvh";
import {Puzzle} from "../logic/puzzle/puzzle";
import {PuzzleGame} from "../logic/game";

function useGame(image, columns, rows) {
	const canvas = useRef();
	const game = useRef();
	useEffect(() => {
		const puzzle = new Puzzle(image, columns, rows);
		game.current = new PuzzleGame(puzzle, canvas.current);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			const {camera, renderer} = game.current;

			if (event.ctrlKey) {
				// zoom
				const offx = event.offsetX, offy = event.offsetY;
				const oldPos = renderer.viewportToWorld(offx, offy, camera);
				camera.zoom = Math.max(1, Math.min(50, camera.zoom + event.deltaY / 100));

				// center zoom on mouse position
				const newPos = renderer.viewportToWorld(offx, offy, camera);
				camera.x += oldPos.x - newPos.x;
				camera.y += oldPos.y - newPos.y;
			} else if (event.shiftKey) {
				// horizontal scrolling
				game.current.camera.x += event.deltaY * camera.zoom / 1000;
			} else {
				// vertical scrolling
				game.current.camera.y -= event.deltaY * camera.zoom / 1000;
			}
		}, {passive: false});

		function mouseDragGroup(rootPiece, pos) {
			const {camera, renderer, bvh} = game.current;
			const mouseDownStamp = Date.now();
			let snapToPiece = rootPiece;
			let moved = false;

			// lift the group of pieces
			const pieceDefs = [];
			for (const piece of rootPiece.group.pieces) {
				pieceDefs.push({
					piece,
					offset: {x: piece.x - pos.x, y: piece.y - pos.y},
				});
				piece.zIndex = 999;
			}

			// handle dragging the group
			function mouseMove(event) {
				event.preventDefault();

				// move the pieces
				const offx = event.offsetX, offy = event.offsetY;
				const pos = renderer.viewportToWorld(offx, offy, camera);
				for (const def of pieceDefs) {
					def.piece.x = pos.x + def.offset.x;
					def.piece.y = pos.y + def.offset.y;
				}

				moved = true;
			}

			// handle end of drag
			function mouseUp(event) {
				event.preventDefault();

				// apply rotation if this was a tap
				if (Date.now() - mouseDownStamp < 200 || !moved) {
					const diff = event.shiftKey ? 1 : -1;
					let newOrientation = (rootPiece.orientation + diff) % 4;
					if (newOrientation === -1) newOrientation = 3;

					// reorient pieces in group
					const offx = event.offsetX, offy = event.offsetY;
					const pos = renderer.viewportToWorld(offx, offy, camera);
					for (const def of pieceDefs) {
						def.piece.orientation = newOrientation;

						const newOff = event.shiftKey ? {
							x: -def.offset.y, y: def.offset.x,
						} : {
							x: def.offset.y, y: -def.offset.x,
						};

						def.piece.x = pos.x + newOff.x;
						def.piece.y = pos.y + newOff.y;
					}
				}

				// place pieces down
				for (const def of pieceDefs) {
					bvh.remove(def.piece);
					const hits = bvh.insert(def.piece);

					// check for connections
					const filtered = hits.filter((p) => !def.piece.group.pieces.has(p));
					for (const other of filtered) {
						// early exit if pieces aren't aligned neighbors
						if (
							def.piece.orientation !== other.orientation ||
							!def.piece.isNeighbor(other)
						) {
							continue;
						}

						// check if within snapping distance
						const correctPos = def.piece.getConnectedPosition(other);
						const error = {x: correctPos.x - other.x, y: correctPos.y - other.y};
						if (error.x ** 2 + error.y ** 2 > .04) {
							continue;
						}

						// success! snap to the larger group
						if (snapToPiece.group.size < other.group.size) {
							snapToPiece = other;
						}

						def.piece.group.join(other.group);
					}

					def.piece.zIndex = Math.max(0, ...filtered.map((h) => h.zIndex)) + 1;
				}

				// snap pieces in group to correct positions
				rootPiece.group.correctPositions(snapToPiece);

				// pieces may have been nudged, adjust thier bvh nodes
				for (const piece of rootPiece.group.pieces) {
					bvh.remove(piece);
					bvh.insert(piece);
				}

				canvas.current.removeEventListener("mousemove", mouseMove);
				canvas.current.removeEventListener("mouseup", mouseUp);
			}

			canvas.current.addEventListener("mousemove", mouseMove);
			canvas.current.addEventListener("mouseup", mouseUp);
		}

		function mouseDragCamera(pos) {
			const {camera, renderer} = game.current;

			function mouseMove(event) {
				event.preventDefault();

				const offx = event.offsetX, offy = event.offsetY;
				const curPos = renderer.viewportToWorld(offx, offy, camera);
				camera.x += pos.x - curPos.x;
				camera.y += pos.y - curPos.y;
			}

			function mouseUp() {
				event.preventDefault();

				canvas.current.removeEventListener("mousemove", mouseMove);
				canvas.current.removeEventListener("mouseup", mouseUp);
			}

			canvas.current.addEventListener("mousemove", mouseMove);
			canvas.current.addEventListener("mouseup", mouseUp);
		}

		canvas.current.addEventListener("mousedown", (event) => {
			event.preventDefault();
			const {camera, renderer, bvh} = game.current;

			const offx = event.offsetX, offy = event.offsetY;
			const pos = renderer.viewportToWorld(offx, offy, camera);

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

			if (hits.length > 0) {
				const piece = hits.sort((a, b) => {
					const distDiff = a.dist - b.dist;
					return Math.abs(distDiff < .04) ? b.piece.zIndex - a.piece.zIndex : distDiff;
				})[0].piece;

				mouseDragGroup(piece, pos);
			} else {
				mouseDragCamera(pos);
			}
		});
	}, []);

	return canvas;
}

export function Game({image, columns, rows}) {
	const canvas = useGame(image, columns, rows);

	return (
		<canvas
			style={{width: "1600px", height: "800px"}}
			ref={canvas}
		/>
	);
}
