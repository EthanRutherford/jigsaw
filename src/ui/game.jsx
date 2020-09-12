import React, {useRef, useState} from "react";
import {PuzzleGame} from "../logic/game";
import {Host, Client} from "../logic/multiplayer/network";
import {loadSettings, addSettingsListener, removeSettingsListener} from "../logic/settings";
import {useAsyncEffect} from "../hooks/use-async-effect";
import {mouseZoomPan} from "./controls/mouse";
import {setupPointerControls} from "./controls/pointer";
import {LoadSpinner} from "./load-spinner";
import styles from "../styles/game.css";

async function initGame(ids, roomId, puzzle, savedPieces, canvas, setImage) {
	let mp = null;
	if (roomId != null) {
		if (ids != null) {
			mp = new Host(roomId);
		} else {
			mp = new Client(roomId);
			[puzzle, savedPieces] = await mp.waitForData();
			setImage(puzzle.image);
		}
	}

	const pieces = await puzzle.makePieces();
	const game = new PuzzleGame(ids, puzzle, pieces, savedPieces, canvas);
	game.setBgColor(loadSettings().bgColor);

	if (mp != null) {
		mp.setup(game, puzzle);
	}

	return game;
}

function useGame(ids, puzzle, savedPieces, roomId) {
	const [isLoading, setIsLoading] = useState(true);
	const [image, setImage] = useState(puzzle != null ? puzzle.image : null);
	const canvas = useRef();
	useAsyncEffect(async () => {
		const game = await initGame(ids, roomId, puzzle, savedPieces, canvas.current, setImage);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			mouseZoomPan(game, event);
		}, {passive: false});

		setupPointerControls(game, canvas.current);

		setIsLoading(false);
		game.animLoop();

		const listenForColorChanges = (settings) => {
			game.setBgColor(settings.bgColor);
		};

		addSettingsListener(listenForColorChanges);
		return () => {
			game.stopLoop();
			game.cleanup();
			removeSettingsListener(listenForColorChanges);
		};
	}, []);

	return [canvas, isLoading, image];
}

export function Game({ids, puzzle, savedPieces, roomId}) {
	const [canvas, isLoading, image] = useGame(ids, puzzle, savedPieces, roomId);
	const [isPreviewing, setIsPreviewing] = useState(false);

	return (
		<div className={styles.container}>
			<canvas
				className={styles.viewport}
				ref={canvas}
			/>
			{image && (
				<img
					className={`${styles.preview} ${isPreviewing ? styles.openPreview : ""}`}
					src={image.src}
					onClick={() => setIsPreviewing((i) => !i)}
				/>
			)}
			{isLoading && <LoadSpinner />}
		</div>
	);
}
