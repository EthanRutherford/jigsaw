import React, {useState, useRef} from "react";
import {
	getGameList,
	blobToImage,
	getImageList,
	storePuzzle,
	storeImage,
	deleteGame,
	deleteImage,
	getGamesUsingImageCount,
} from "../logic/jigsaw-db";
import {Puzzle} from "../logic/puzzle/puzzle";
import {PuzzleGame} from "../logic/game";
import {removeSettingsListener, addSettingsListener, loadSettings} from "../logic/settings";
import {notifyCanPrompt, promptForInstall} from "../pwa/install-prompt";
import {useAsyncEffect} from "../hooks/use-async-effect";
import {LoadSpinner} from "./load-spinner";
import {Warning} from "./warning";
import styles from "../styles/menu.css";

function GameSnapshot({game}) {
	const [isLoading, setIsLoading] = useState(true);
	const canvas = useRef();
	useAsyncEffect(async (getIsCancelled) => {
		const image = await blobToImage(game.image);
		if (getIsCancelled()) {
			return null;
		}

		const puzzle = Puzzle.fromSaveFormat(image, game.puzzle);
		const pieces = await puzzle.makePieces();
		if (getIsCancelled()) {
			return null;
		}

		const preview = new PuzzleGame(null, puzzle, pieces, game.pieces, canvas.current);
		preview.setBgColor(loadSettings().bgColor);
		setIsLoading(false);
		preview.render();

		const listenForColorChanges = (settings) => {
			preview.setBgColor(settings.bgColor);
			preview.render();
		};

		addSettingsListener(listenForColorChanges);
		return () => {
			preview.cleanup();
			removeSettingsListener(listenForColorChanges);
		};
	}, []);

	return (
		<div className={styles.snapshotContainer}>
			<canvas className={styles.snapshot} ref={canvas} />
			{isLoading && <LoadSpinner />}
		</div>
	);
}

function Spinput(props) {
	const input = useRef();
	const timeout = useRef(null);
	const interval = useRef(null);
	const decrease = () => {
		input.current.stepDown();
		input.current.dispatchEvent(new Event("change", {bubbles: true}));
	};
	const increase = () => {
		input.current.stepUp();
		input.current.dispatchEvent(new Event("change", {bubbles: true}));
	};
	const spinDown = () => {
		decrease();
		timeout.current = setTimeout(() => {
			interval.current = setInterval(decrease, 50);
		}, 200);
	};
	const spinUp = () => {
		increase();
		timeout.current = setTimeout(() => {
			interval.current = setInterval(increase, 50);
		}, 200);
	};
	const unRepeat = () => {
		clearTimeout(timeout.current);
		clearInterval(interval.current);
	};

	return (
		<div className={styles.spinput}>
			<button onMouseDown={spinDown} onMouseUp={unRepeat} onMouseOut={unRepeat} />
			<input type="number" {...props} ref={input} />
			<button onMouseDown={spinUp} onMouseUp={unRepeat} onMouseOut={unRepeat} />
		</div>
	);
}

export function SaveGamePicker({startGame, newGame}) {
	const [canPrompt, setCanPrompt] = useState();
	const [gameList, setGameList] = useState();
	const [deleteState, setDeleteState] = useState();
	useAsyncEffect(async (getIsCancelled) => {
		const list = await getGameList();
		if (getIsCancelled()) {
			return null;
		}

		setGameList(list);
		notifyCanPrompt(() => setCanPrompt(true));
		return () => notifyCanPrompt(null);
	}, []);

	if (gameList == null) {
		return null;
	}

	let firstBlank = 1;
	for (const item of gameList) {
		if (firstBlank !== item.id) {
			break;
		}

		firstBlank++;
	}

	return (
		<div className={styles.menu}>
			{gameList.map((game) => (
				<div className={styles.saveWrapper} key={game.id}>
					<button
						className={styles.savedGame}
						onClick={async () => {
							const image = await blobToImage(game.value.image);
							startGame({
								ids: {
									gameId: game.id,
									imageId: game.value.imageId,
									puzzleId: game.value.puzzleId,
								},
								puzzle: Puzzle.fromSaveFormat(image, game.value.puzzle),
								savedPieces: game.value.pieces,
							});
						}}
					>
						<GameSnapshot game={game.value} />
						<div className={styles.buttonText}>Resume save {game.id}</div>
					</button>
					<button
						className={styles.deleteButton}
						onClick={() => setDeleteState({id: game.id})}
					>
						delete
					</button>
				</div>
			))}
			{firstBlank <= 5 && (
				<button
					className={styles.newGame}
					onClick={() => newGame(firstBlank)}
				>
					New game
				</button>
			)}
			{canPrompt && (
				<button
					className={styles.addToHomescreen}
					onClick={() => promptForInstall().then(() => setCanPrompt(false))}
				>
					add to homescreen
				</button>
			)}
			{deleteState != null && (
				<Warning
					header="Are you sure?"
					content="This game cannot be restored later!"
					confirm="Delete"
					cancel="Cancel"
					onConfirm={async () => {
						await deleteGame(deleteState.id);
						setDeleteState();
						setGameList((list) => {
							const index = list.findIndex((g) => g.id === deleteState.id);
							return [
								...list.slice(0, index),
								...list.slice(index + 1),
							];
						});
					}}
					onCancel={() => setDeleteState()}
				/>
			)}
		</div>
	);
}

const artHref = "https://www.creativebloq.com/features/how-to-break-into-pixel-art";
const linkProps = {target: "_blank", rel: "noopener"};
export function ImagePicker({setImage}) {
	const fileInput = useRef();
	const [imageList, setImageList] = useState([]);
	const [deleteState, setDeleteState] = useState();
	const [isDragging, setIsDragging] = useState(false);
	useAsyncEffect(async (getIsCancelled) => {
		const list = await getImageList();
		if (getIsCancelled()) {
			return;
		}

		setImageList(list);
	}, []);

	return (
		<div className={styles.menu}>
			<div className={styles.hint}>
				Need some inspiration? Check <a href={artHref} {...linkProps}>here</a> for
				some pixel art that makes for excellent puzzles!
			</div>
			{imageList.map((image) => (
				<div className={styles.saveWrapper} key={image.id}>
					<button
						className={styles.imageButton}
						onClick={async () => setImage({
							value: await blobToImage(image.value),
							id: image.id,
						})}
					>
						<img className={styles.snapshot} src={URL.createObjectURL(image.value)} />
					</button>
					<button
						className={styles.deleteButton}
						onClick={async () => {
							const count = await getGamesUsingImageCount(image.id);
							setDeleteState({id: image.id, count});
						}}
					>
						delete
					</button>
				</div>
			))}
			{imageList.length < 100 && (
				<div
					className={`${styles.dropArea} ${isDragging ? styles.dragOver : ""}`}
					onDragOver={(event) => event.preventDefault()}
					onDragEnter={(event) => {
						if (
							!isDragging &&
							event.dataTransfer.types.length > 0 &&
							event.dataTransfer.types[0] === "Files"
						) {
							event.preventDefault();
							setIsDragging(true);
						}
					}}
					onDragLeave={(event) => {
						if (
							event.currentTarget !== event.relatedTarget &&
							!event.currentTarget.contains(event.relatedTarget) &&
							!event.currentTarget.contains(event.relatedTarget.getRootNode().host)
						) {
							event.preventDefault();
							setIsDragging(false);
						}
					}}
					onDrop={async (event) => {
						event.preventDefault();
						setIsDragging(false);
						if (
							event.dataTransfer.files.length > 0 &&
							event.dataTransfer.files[0].type.startsWith("image")
						) {
							const file = event.dataTransfer.files[0];
							const id = await storeImage(file);
							setImageList((list) => [...list, {id, value: file}]);
						}
					}}
				>
					<input
						className={styles.pasteArea}
						placeholder="paste image data"
						value=""
						onChange={() => {}}
						onPaste={async (event) => {
							if (event.clipboardData.files.length !== 0) {
								const file = event.clipboardData.files[0];
								if (file.type.startsWith("image")) {
									const id = await storeImage(file);
									setImageList((list) => [...list, {id, value: file}]);
								}
							}
						}}
					/>
					<button
						className={styles.uploadButton}
						onClick={() => fileInput.current.click()}
					>
						upload image
					</button>
					<input
						className={styles.invisibleFile}
						type="file"
						accept="image/*"
						onChange={async (event) => {
							const file = event.target.files[0];
							if (file.type.startsWith("image")) {
								const id = await storeImage(file);
								setImageList((list) => [...list, {id, value: file}]);
							}
						}}
						ref={fileInput}
					/>
				</div>
			)}
			{deleteState != null && (
				<Warning
					header="Are you sure?"
					content={`There are ${deleteState.count} games using this image, this action will also delete those games.`}
					confirm="Delete"
					cancel="Cancel"
					onConfirm={async () => {
						await deleteImage(deleteState.id);
						setDeleteState();
						setImageList((list) => {
							const index = list.findIndex((i) => i.id === deleteState.id);
							return [
								...list.slice(0, index),
								...list.slice(index + 1),
							];
						});
					}}
					onCancel={() => setDeleteState()}
				/>
			)}
		</div>
	);
}

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
function boundColumns(w, h, c, r) {
	const pieceWidth = w / c;
	const pieceHeight = h / r;
	if (pieceWidth < pieceHeight / 1.25) {
		return Math.floor(w / (pieceHeight / 1.25));
	}

	if (pieceWidth > pieceHeight * 1.25) {
		return Math.ceil(w / (pieceHeight * 1.25));
	}

	return c;
}
function boundRows(w, h, c, r) {
	const pieceWidth = w / c;
	const pieceHeight = h / r;
	if (pieceHeight < pieceWidth / 1.25) {
		return Math.floor(h / (pieceWidth / 1.25));
	}

	if (pieceHeight > pieceWidth * 1.25) {
		return Math.ceil(h / (pieceWidth * 1.25));
	}

	return r;
}
function computeBestRows(w, h, c) {
	// initial suggestion should be the closest even number that results in
	// pieces that are square (i.e. have an aspect ratio of 1:1)
	const pieceWidth = w / c;
	return Math.round((h / pieceWidth) / 2) * 2;
}
export function PuzzlePicker({gameId, image, startGame}) {
	const w = image.value.width;
	const h = image.value.height;
	const [columns, setColumns] = useState(20);
	const [rows, setRows] = useState(computeBestRows(w, h, 20));

	return (
		<div className={styles.menu}>
			<label className={styles.label}>
				Columns
				<Spinput
					value={columns}
					onChange={(event) => {
						const value = Number.parseInt(event.target.value, 10);
						if (!Number.isNaN(value)) {
							setColumns(value);
							setRows(clamp(boundRows(w, h, clamp(value, 5, 50), rows), 5, 50));
						} else {
							setColumns("");
						}
					}}
					onBlur={() => {
						let c = clamp(columns, 5, 50);
						const r = clamp(boundRows(w, h, c, rows), 5, 50);
						c = boundColumns(w, h, c, r);
						setColumns(c);
						setRows(r);
					}}
					min={Math.max(5, boundColumns(w, h, 5, 5))}
					max={Math.min(50, boundColumns(w, h, 50, 50))}
				/>
			</label>
			<label className={styles.label}>
				Rows
				<Spinput
					value={rows}
					onChange={(event) => {
						const value = Number.parseInt(event.target.value, 10);
						if (!Number.isNaN(value)) {
							setRows(value);
							setColumns(clamp(boundColumns(w, h, columns, clamp(value, 5, 50)), 5, 50));
						} else {
							setRows("");
						}
					}}
					onBlur={() => {
						let r = clamp(rows, 5, 50);
						const c = clamp(boundColumns(w, h, columns, r), 5, 50);
						r = boundRows(w, h, c, r);
						setColumns(c);
						setRows(r);
					}}
					min={Math.max(5, boundRows(w, h, 5, 5))}
					max={Math.min(50, boundRows(w, h, 50, 50))}
				/>
			</label>
			<button
				className={styles.accept}
				onClick={async () => {
					const puzzle = new Puzzle(image.value, columns, rows);
					const puzzleId = await storePuzzle(Puzzle.toSaveFormat(puzzle));

					startGame({
						ids: {gameId, imageId: image.id, puzzleId},
						puzzle,
						savedPieces: [],
					});
				}}
			>
				Start game
			</button>
		</div>
	);
}
