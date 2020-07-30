import {makeLines} from "./generate";
import PuzzleWorker from "./puzzle.worker";

export class Puzzle {
	constructor(image, columns, rows, horizontal = null, vertical = null) {
		this.image = image;
		this.width = image.width;
		this.height = image.height;

		// choose scale such that source image is at least 2000px wide
		// this is primarily to ensure the piece borders are decently smooth
		this.scale = Math.ceil(2000 / image.width);
		this.c = columns;
		this.r = rows;

		// try to use whole numbers of pixels
		const fw = image.width * this.scale;
		const fh = image.height * this.scale;
		this.w = Math.floor(fw / columns);
		this.h = Math.floor(fh / rows);
		this.rw = fw - (this.w * columns);
		this.rh = fh - (this.h * rows);

		if (horizontal != null && vertical != null) {
			this.horizontal = horizontal;
			this.vertical = vertical;
		} else {
			const lines = makeLines(columns, rows);
			this.horizontal = lines.horizontal;
			this.vertical = lines.vertical;
		}
	}
	async drawPieces() {
		const {image: img, horizontal, vertical, w: width, h: height, scale, c, r, rw, rh} = this;
		const image = await createImageBitmap(img);

		return new Promise((resolve) => {
			const worker = new PuzzleWorker();

			const canvases = [];
			const offscreens = [];
			for (let i = 0; i < c * r; i++) {
				const pair = [];
				const opair = [];
				for (let j = 0; j < 2; j++) {
					const canvas = document.createElement("canvas");
					pair.push(canvas);
					opair.push(canvas.transferControlToOffscreen());
				}

				canvases.push(pair);
				offscreens.push(opair);
			}

			worker.postMessage({
				image, canvases: offscreens, horizontal, vertical, width, height, scale, c, r, rw, rh,
			}, offscreens.flat());

			worker.onmessage = () => resolve(canvases);
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
