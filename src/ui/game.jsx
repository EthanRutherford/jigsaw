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
	const [color, setColor] = useState(loadSettings().mpColor);
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
			setColor(settings.mpColor);
			game.setBgColor(settings.bgColor);
		};

		addSettingsListener(listenForColorChanges);
		return () => {
			game.stopLoop();
			game.cleanup();
			removeSettingsListener(listenForColorChanges);
		};
	}, []);

	return [canvas, loadState, image, color];
}

function svgCursor(color) {
	const colorString = `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
	const head = `<svg width="24px" height="24px" viewBox="0 0 10 10" xmlns="http://www.w3.org/2000/svg">`;
	const path = `<path d="M0 0L10 5L5 10Z" fill="${colorString}" />`;
	const tail = `</svg>`;

	return `url('data:image/svg+xml;utf8,${head + path + tail}')`;
}

export function Game({ids, puzzle, savedPieces, roomId, updatePeers}) {
	const [canvas, loadState, image, color] = useGame(ids, puzzle, savedPieces, roomId, updatePeers);
	const [isPreviewing, setIsPreviewing] = useState(false);

	return (
		<div className={styles.container} style={{cursor: svgCursor(color)}}>
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
