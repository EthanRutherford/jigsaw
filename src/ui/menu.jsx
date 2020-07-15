import React, {useState, useEffect, useRef} from "react";
import {getGameList, blobToImage, getImageList, storePuzzle, storeImage, deleteGame, deleteImage, getGamesUsingImageCount} from "../logic/jigsaw-db";
import styles from "../styles/menu.css";
import {Puzzle} from "../logic/puzzle/puzzle";
import {PuzzleGame} from "../logic/game";

function GameSnapshot({game}) {
	const canvas = useRef();
	useEffect(() => {
		(async () => {
			const image = await blobToImage(game.image);

			const puzzle = Puzzle.fromSaveFormat(image, game.puzzle);
			const preview = new PuzzleGame(null, puzzle, game.pieces, canvas.current);
			preview.render();
		})();
	}, []);

	return <canvas className={styles.snapshot} ref={canvas} />;
}

function SaveGamePicker({startGame, newGame}) {
	const [gameList, setGameList] = useState();
	useEffect(() => {
		getGameList().then(setGameList);
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
		<div>
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
								pieces: game.value.pieces,
							});
						}}
					>
						<GameSnapshot game={game.value} />
						<div className={styles.buttonText}>Resume save {game.id}</div>
					</button>
					<button
						className={styles.deleteButton}
						onClick={async () => {
							await deleteGame(game.id);
							setGameList((list) => {
								const index = list.findIndex((g) => g.id === game.id);
								return [
									...list.slice(0, index),
									...list.slice(index + 1),
								];
							});
						}}
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
					<div className={styles.buttonText}>New game</div>
				</button>
			)}
		</div>
	);
}

function ImagePicker({setImage}) {
	const [imageList, setImageList] = useState([]);
	useEffect(() => {
		getImageList().then(setImageList);
	}, []);

	return (
		<div>
			{imageList.map((image) => (
				<div className={styles.saveWrapper} key={image.id}>
					<button
						className={styles.savedGame}
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
							const gameCount = await getGamesUsingImageCount(image.id);

							// TODO: translate confirm into a native component
							if (confirm(`There are ${gameCount} games using this image, this action will also delete those games. Delete anyway?`)) {
								await deleteImage(image.id);
								setImageList((list) => {
									const index = list.findIndex((i) => i.id === image.id);
									return [
										...list.slice(0, index),
										...list.slice(index + 1),
									];
								});
							}
						}}
					>
						delete
					</button>
				</div>
			))}
			{imageList.length < 100 && (
				<input
					type="file"
					accept="image/*"
					onChange={async (event) => {
						const file = event.target.files[0];
						if (file.type.startsWith("image")) {
							const id = await storeImage(file);
							setImageList((list) => [...list, {id, value: file}]);
						}
					}}
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

function PuzzlePicker({gameId, image, startGame}) {
	const w = image.value.width;
	const h = image.value.height;
	const [columns, setColumns] = useState(20);
	const [rows, setRows] = useState(boundRows(w, h, 20, 10));

	return (
		<div>
			<input
				type="number"
				value={columns}
				onChange={(event) => setColumns(event.target.value)}
				onBlur={() => {
					let c = clamp(columns, 5, 50);
					const r = clamp(boundRows(w, h, c, rows), 5, 50);
					c = boundColumns(w, h, c, r);
					setColumns(c);
					setRows(r);
				}}
				min={5}
				max={50}
			/>
			<input
				type="number"
				value={rows}
				onChange={(event) => setRows(event.target.value)}
				onBlur={() => {
					let r = clamp(rows, 5, 50);
					const c = clamp(boundColumns(w, h, columns, r), 5, 50);
					r = boundRows(w, h, c, r);
					setColumns(c);
					setRows(r);
				}}
				min={5}
				max={50}
			/>
			<button
				onClick={async () => {
					const puzzle = new Puzzle(image.value, columns, rows);
					const puzzleId = await storePuzzle(Puzzle.toSaveFormat(puzzle));

					startGame({
						ids: {gameId, imageId: image.id, puzzleId},
						puzzle,
						pieces: [],
					});
				}}
			>
				Accept
			</button>
		</div>
	);
}

export function Menu({startGame}) {
	const [gameId, setGameId] = useState();
	const [image, setImage] = useState();

	if (gameId == null) {
		return <SaveGamePicker startGame={startGame} newGame={setGameId} />;
	}

	if (image == null) {
		return <ImagePicker setImage={setImage} />;
	}

	return (
		<PuzzlePicker gameId={gameId} image={image} startGame={startGame} />
	);
}
