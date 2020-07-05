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

		function mouseDragPiece(piece, pos) {
			const {camera, renderer, bvh} = game.current;

			// lift the piece
			const offset = {x: piece.x - pos.x, y: piece.y - pos.y};
			piece.zIndex = 999;

			function mouseMove(event) {
				event.preventDefault();

				// move the piece
				const offx = event.offsetX, offy = event.offsetY;
				const pos = renderer.viewportToWorld(offx, offy, camera);
				piece.x = pos.x + offset.x;
				piece.y = pos.y + offset.y;
			}

			function mouseUp() {
				event.preventDefault();

				// place piece down
				bvh.remove(piece);
				const hits = bvh.insert(piece);
				piece.zIndex = Math.max(0, ...hits.map((h) => h.zIndex)) + 1;

				// TODO: check for connections

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

				mouseDragPiece(piece, pos);
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
