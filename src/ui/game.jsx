import React, {useRef, useState} from "react";
import {PuzzleGame} from "../logic/game";
import {useAsyncEffect} from "../hooks/use-async-effect";
import {mouseZoomPan} from "./controls/mouse";
import {setupPointerControls} from "./controls/pointer";
import {LoadSpinner} from "./load-spinner";
import styles from "../styles/game.css";

function useGame(ids, puzzle, savedPieces) {
	const [isLoading, setIsLoading] = useState(true);
	const canvas = useRef();
	useAsyncEffect(async () => {
		const pieces = await puzzle.drawPieces();
		const game = new PuzzleGame(ids, puzzle, pieces, savedPieces, canvas.current);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			mouseZoomPan(game, event);
		}, {passive: false});

		setupPointerControls(game, canvas.current);

		setIsLoading(false);
		game.animLoop();
		return () => {
			game.stopLoop();
			game.cleanup();
		};
	}, []);

	return [canvas, isLoading];
}

export function Game({ids, puzzle, savedPieces}) {
	const [canvas, isLoading] = useGame(ids, puzzle, savedPieces);
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
			{isLoading && <LoadSpinner />}
		</div>
	);
}
