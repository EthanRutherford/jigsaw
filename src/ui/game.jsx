import React, {useRef, useEffect, useState} from "react";
import {Puzzle} from "../logic/puzzle/puzzle";
import {PuzzleGame} from "../logic/game";
import {mouseZoomPan} from "./controls/mouse";
import {setupPointerControls} from "./controls/pointer";
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

		setupPointerControls(game, canvas.current);
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
			<img
				className={`${styles.preview} ${isPreviewing ? styles.openPreview : ""}`}
				src={image.src}
				onClick={() => setIsPreviewing((i) => !i)}
			/>
		</div>
	);
}
