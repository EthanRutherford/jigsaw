import React, {useRef, useState} from "react";
import {PuzzleGame} from "../logic/game";
import {Host, Client} from "../logic/multiplayer/network";
import {loadSettings, addSettingsListener, removeSettingsListener} from "../logic/settings";
import {useAsyncEffect} from "../hooks/use-async-effect";
import {mouseZoomPan} from "./controls/mouse";
import {setupPointerControls} from "./controls/pointer";
import {LoadSpinner} from "./load-spinner";
import styles from "../styles/game.css";

const loadStates = {
	none: 0,
	waiting: 1,
	initializing: 2,
	done: 3,
};

async function initGame(ids, roomId, puzzle, savedPieces, canvas, setImage, setLoadState, updatePeers) {
	let mp = null;
	if (roomId != null) {
		if (ids != null) {
			mp = new Host(roomId, updatePeers);
		} else {
			setLoadState(loadStates.waiting);
			mp = new Client(roomId, updatePeers);
			[puzzle, savedPieces] = await mp.waitForData();
			setImage(puzzle.image);
		}
	}

	setLoadState(loadStates.initializing);
	const pieces = await puzzle.makePieces();
	const game = new PuzzleGame(ids, puzzle, pieces, savedPieces, canvas);
	game.setBgColor(loadSettings().bgColor);

	if (mp != null) {
		mp.setup(game, puzzle);
	}

	setLoadState(loadStates.done);
	return game;
}

function useGame(ids, puzzle, savedPieces, roomId, updatePeers) {
	const [loadState, setLoadState] = useState(loadStates.none);
	const [image, setImage] = useState(puzzle != null ? puzzle.image : null);
	const canvas = useRef();
	useAsyncEffect(async () => {
		const game = await initGame(
			ids, roomId, puzzle, savedPieces, canvas.current, setImage, setLoadState, updatePeers,
		);

		canvas.current.addEventListener("wheel", (event) => {
			event.preventDefault();
			mouseZoomPan(game, event);
		}, {passive: false});
		setupPointerControls(game, canvas.current);
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

	return [canvas, loadState, image];
}

export function Game({ids, puzzle, savedPieces, roomId, updatePeers}) {
	const [canvas, loadState, image] = useGame(ids, puzzle, savedPieces, roomId, updatePeers);
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
			{loadState !== loadStates.done && (
				<>
					<LoadSpinner />
					<div className={styles.loadIndicator}>
						{loadState === loadStates.waiting && "Waiting for host..."}
						{loadState === loadStates.initializing && "initializing game..."}
					</div>
				</>
			)}
		</div>
	);
}
