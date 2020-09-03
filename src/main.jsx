import {render} from "react-dom";
import React, {useState, useEffect, useMemo} from "react";
import {storeImage} from "./logic/jigsaw-db";
import {Header} from "./ui/header";
import {Game} from "./ui/game";
import {SaveGamePicker, ImagePicker, PuzzlePicker} from "./ui/menu";
import styles from "./styles/root.css";

// register service worker
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/service-worker.js");

		navigator.serviceWorker.onmessage = (event) => {
			storeImage(event.data.image);
		};
	}, {once: true});
}

function useCustomHistory() {
	const stack = useMemo(() => [{page: "home"}], []);
	const [, toggle] = useState();

	useEffect(() => {
		// initialize or restore proper state
		if (history.state == null) {
			history.replaceState({home: true}, null, "/");
		} else if (!history.state.home) {
			history.back();
		}

		window.onpopstate = () => {
			if (history.state == null || !history.state.home) {
				// the user got here by some odd transition
				// go back to the home page
				history.back();
			} else if (stack.length > 1) {
				// pop off an entry from the stack
				stack.pop();
				toggle((t) => !t);

				// if we're not all the way back home, push non-home state
				if (stack.length > 1) {
					history.pushState({home: false}, null, "/");
				}
			}
		};
	}, []);

	const pushState = (state) => {
		if (history.state.home) {
			history.pushState({home: false}, null, "/");
		}

		stack.push(state);
		toggle((t) => !t);
	};

	const goHome = () => {
		if (stack.length > 1) {
			stack.splice(1, Infinity);
			history.back();
			toggle((t) => !t);
		}
	};

	return [stack[stack.length - 1], pushState, goHome];
}

function App() {
	const [state, pushState, goHome] = useCustomHistory();

	const startGame = (gameData) => {
		pushState({gameData, page: "game"});
	};

	const newGame = (gameId) => {
		pushState({gameId, page: "image"});
	};

	const pickImage = (image) => {
		pushState({gameId: state.gameId, image, page: "puzzle"});
	};

	return (
		<div className={styles.app}>
			<Header goHome={goHome} />
			{state.page === "home" ? (
				<SaveGamePicker startGame={startGame} newGame={newGame} />
			) : state.page === "image" ? (
				<ImagePicker setImage={pickImage} />
			) : state.page === "puzzle" ? (
				<PuzzlePicker gameId={state.gameId} image={state.image} startGame={startGame} />
			) : state.page === "game" ? (
				<Game {...state.gameData} />
			) : (
				<div>this shouldn't happen :(</div>
			)}
		</div>
	);
}

render(<App />, document.getElementById("react-root"));
