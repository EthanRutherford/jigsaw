import {render} from "react-dom";
import React, {useEffect, useState} from "react";
import {Game} from "./ui/game";

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




// debugging, print the whole puzzle
import {Puzzle} from "./logic/puzzle/puzzle";

async function main() {
	const image = await Puzzle.fetchImage("https://cdn.mos.cms.futurecdn.net/jbCNvTM4gwr2qV8X8fW3ZB.png");
	const puzzle = new Puzzle(image, 20, 10);

	document.body.append(puzzle.drawFullPuzzle());
	for (let i = 0; i < puzzle.c; i++) {
		for (let j = 0; j < puzzle.r; j++) {
			document.body.append(puzzle.drawPiece(i, j));
		}
	}
}

main();
