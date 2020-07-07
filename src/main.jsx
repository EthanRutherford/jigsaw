import {render} from "react-dom";
import React, {useEffect, useState} from "react";
import {Puzzle} from "./logic/puzzle/puzzle";
import {Game} from "./ui/game";
import "./styles/root.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");
	}, {once: true});
}

function App() {
	const [image, setImage] = useState();
	useEffect(() => {
		Puzzle.fetchImage(
			"https://cdn.mos.cms.futurecdn.net/jbCNvTM4gwr2qV8X8fW3ZB.png",
		).then(setImage);
	}, []);

	if (image == null) {
		return null;
	}

	return <Game image={image} columns={20} rows={10} />;
}

render(<App />, document.getElementById("react-root"));
