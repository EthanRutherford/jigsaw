import React, {useRef, useEffect, useState} from "react";
import {PuzzleGame} from "../logic/game";
import {mouseZoomPan} from "./controls/mouse";
import {setupPointerControls} from "./controls/pointer";
import styles from "../styles/game.css";

function useGame(ids, puzzle, pieces) {
	const canvas = useRef();
	useEffect(() => {
		const game = new PuzzleGame(ids, puzzle, pieces, canvas.current);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			mouseZoomPan(game, event);
		}, {passive: false});

		setupPointerControls(game, canvas.current);

		game.animLoop();
		return () => game.stopLoop();
	}, []);

	return canvas;
}

export function Game({ids, puzzle, pieces}) {
	const canvas = useGame(ids, puzzle, pieces);
	const [isPreviewing, setIsPreviewing] = useState();

	return (
		<div className={styles.container}>
			<canvas
				className={styles.viewport}
				ref={canvas}
			/>
			<img
				className={`${styles.preview} ${isPreviewing ? styles.openPreview : ""}`}
				src={puzzle.image.src}
				onClick={() => setIsPreviewing((i) => !i)}
			/>
		</div>
	);
}
