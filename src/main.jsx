import {render} from "react-dom";
import React, {useState} from "react";
import {Header} from "./ui/header";
import {Game} from "./ui/game";
import {SaveGamePicker, ImagePicker, PuzzlePicker} from "./ui/menu";
import styles from "./styles/root.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");
	}, {once: true});
}

function App() {
	const [gameData, setGameData] = useState();
	const [image, setImage] = useState();
	const [gameId, setGameId] = useState();

	return (
		<div className={styles.app}>
			<Header />
			{gameData != null ? (
				<Game {...gameData} />
			) : image != null ? (
				<PuzzlePicker gameId={gameId} image={image} startGame={setGameData} />
			) : gameId != null ? (
				<ImagePicker setImage={setImage} />
			) : (
				<SaveGamePicker startGame={setGameData} newGame={setGameId} />
			)}
		</div>
	);
}

render(<App />, document.getElementById("react-root"));
