import React, {useRef, useEffect, useState} from "react";
import {Puzzle} from "../logic/puzzle/puzzle";
import {PuzzleGame} from "../logic/game";
import {mouseZoomPan, mouseDragGroup, mouseDragCamera} from "./controls/mouse";
import styles from "../styles/game.css";

function useGame(image, columns, rows) {
	const canvas = useRef();
	useEffect(() => {
		const puzzle = new Puzzle(image, columns, rows);
		const game = new PuzzleGame(puzzle, canvas.current);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			mouseZoomPan(game, event);
		}, {passive: false});

		canvas.current.addEventListener("mousedown", (event) => {
			event.preventDefault();
			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			const hit = game.query(pos);

			if (hit != null) {
				mouseDragGroup(game, canvas.current, hit, pos);
			} else {
				mouseDragCamera(game, canvas.current, pos);
			}
		});
	}, []);

	return canvas;
}

export function Game({image, columns, rows}) {
	const canvas = useGame(image, columns, rows);
	const [isPreviewing, setIsPreviewing] = useState();

	return (
		<div className={styles.container}>
			<canvas
				className={styles.viewport}
				ref={canvas}
			/>
			<div className={styles.previewContainer}>
				<img
					className={`${styles.preview} ${isPreviewing ? styles.openPreview : ""}`}
					src={image.src}
					onClick={() => setIsPreviewing((i) => !i)}
				/>
			</div>
		</div>
	);
}
