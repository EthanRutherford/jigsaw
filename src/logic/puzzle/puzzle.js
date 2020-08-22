import {makeLines} from "./generate";
import PuzzleWorker from "./puzzle.worker";

export class Puzzle {
	constructor(image, columns, rows, horizontal = null, vertical = null) {
		this.image = image;
		this.width = image.width;
		this.height = image.height;
		this.c = columns;
		this.r = rows;

		this.w = Math.floor(image.width / columns);
		this.h = Math.floor(image.height / rows);

		if (horizontal != null && vertical != null) {
			this.horizontal = horizontal;
			this.vertical = vertical;
		} else {
			const lines = makeLines(columns, rows);
			this.horizontal = lines.horizontal;
			this.vertical = lines.vertical;
		}
	}
	async makePieces() {
		const {horizontal, vertical, w, h, c, r} = this;

		return new Promise((resolve) => {
			const worker = new PuzzleWorker();

			worker.postMessage({horizontal, vertical, w, h, c, r});

			worker.onmessage = (event) => {
				worker.terminate();
				resolve(event.data);
			};
		});
	}
	static fetchImage(url) {
		// uses third party service to get past CORS
		return new Promise((resolve, reject) => {
			const image = new Image();
			image.src = `https://cors-anywhere.herokuapp.com/${url}`;
			image.crossOrigin = "anonymous";

			image.onload = () => resolve(image);
			image.onerror = reject;
		});
	}
	static toSaveFormat(puzzle) {
		return {
			c: puzzle.c,
			r: puzzle.r,
			horizontal: puzzle.horizontal,
			vertical: puzzle.vertical,
		};
	}
	static fromSaveFormat(image, save) {
		return new Puzzle(image, save.c, save.r, save.horizontal, save.vertical);
	}
}
