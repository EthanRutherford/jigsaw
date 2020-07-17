import {render} from "react-dom";
import React, {useState} from "react";
import {Header} from "./ui/header";
import {Game} from "./ui/game";
import {Menu} from "./ui/menu";
import styles from "./styles/root.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");
	}, {once: true});
}

function App() {
	const [gameData, setGameData] = useState();

	return (
		<div className={styles.app}>
			<Header />
			{gameData == null ? (
				<Menu startGame={setGameData} />
			) : (
				<Game {...gameData} />
			)}
		</div>
	);
}

render(<App />, document.getElementById("react-root"));
