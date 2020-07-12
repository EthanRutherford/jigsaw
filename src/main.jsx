import {render} from "react-dom";
import React, {useState} from "react";
import {Game} from "./ui/game";
import {Menu} from "./ui/menu";
import "./styles/root.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");
	}, {once: true});
}

function App() {
	const [gameData, setGameData] = useState();

	if (gameData == null) {
		return <Menu startGame={setGameData} />;
	}

	return <Game {...gameData} />;
}

render(<App />, document.getElementById("react-root"));
