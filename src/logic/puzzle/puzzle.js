import {makeLines} from "./generate";

function drawEdge(context, edge, w, h, x, y) {
	for (const curve of edge) {
		context.bezierCurveTo(
			x + curve.c0.x * w, y + (curve.c0.y * h),
			x + curve.c1.x * w, y + (curve.c1.y * h),
			x + curve.to.x * w, y + (curve.to.y * h),
		);
	}
}
function reverseEdge(edge, fx, fy) {
	return edge.map((c, i) => {
		const to = i === 0 ? {x: fx, y: fy} : edge[i - 1].to;
		return {c0: c.c1, c1: c.c0, to};
	}).reverse();
}

export class Puzzle {
	constructor(image, columns, rows) {
		this.image = image;
		this.width = image.width;
		this.height = image.height;

		this.c = columns;
		this.r = rows;
		this.w = image.width / columns;
		this.h = image.height / rows;

		const lines = makeLines(columns, rows);
		this.horizontal = lines.horizontal;
		this.vertical = lines.vertical;
	}
	drawFullPuzzle() {
		const canvas = document.createElement("canvas");
		canvas.width = this.width;
		canvas.height = this.height;

		const context = canvas.getContext("2d");
		// draw image
		context.drawImage(this.image, 0, 0);

		// draw lines that cut puzzle into pieces
		const {w, h, horizontal, vertical} = this;
		context.strokeStyle = "rgba(255, 255, 255, .8)";

		for (let i = 0; i < horizontal.length; i++) {
			const line = horizontal[i];
			const y = (i + 1) * h;

			context.beginPath();
			context.moveTo(0, y);

			for (let j = 0; j < line.length; j++) {
				const edge = line[j];
				const x = j * w;
				drawEdge(context, edge, w, h, x, y);
			}

			context.stroke();
		}

		for (let i = 0; i < vertical.length; i++) {
			const line = vertical[i];
			const x = (i + 1) * w;

			context.beginPath();
			context.moveTo(x, 0);

			for (let j = 0; j < line.length; j++) {
				const edge = line[j];
				const y = j * h;
				drawEdge(context, edge, w, h, x, y);
			}

			context.stroke();
		}

		return canvas;
	}
	drawPiece(x, y) {
		const {image, c, r, horizontal, vertical} = this;

		// choose scale such that drawn images are at least 200px wide
		// this is primarily to ensure the piece borders are fairly smooth
		const scale = Math.ceil(200 / this.w);
		const w = this.w * scale;
		const h = this.h * scale;

		const canvas = document.createElement("canvas");
		canvas.width = w * 2;
		canvas.height = h * 2;

		const left = w / 2;
		const right = w * 2 - w / 2;
		const top = h / 2;
		const bottom = h * 2 - h / 2;

		const context = canvas.getContext("2d");
		context.beginPath();
		context.moveTo(left, top);

		// draw top edge
		if (y === 0) {
			context.lineTo(right, top);
		} else {
			const edge = horizontal[y - 1][x];
			drawEdge(context, edge, w, h, left, top);
		}

		// draw right edge
		if (x === c - 1) {
			context.lineTo(right, bottom);
		} else {
			const edge = vertical[x][y];
			drawEdge(context, edge, w, h, right, top);
		}

		// draw bottom edge
		if (y === r - 1) {
			context.lineTo(left, bottom);
		} else {
			const edge = reverseEdge(horizontal[y][x], 0, 0);
			drawEdge(context, edge, w, h, left, bottom);
		}

		// draw left edge
		if (x === 0) {
			context.lineTo(left, top);
		} else {
			const edge = reverseEdge(vertical[x - 1][y], 0, 0);
			drawEdge(context, edge, w, h, left, top);
		}

		context.fill();
		context.globalCompositeOperation = "source-in";
		context.imageSmoothingEnabled = false;
		context.drawImage(image, left - (x * w), top - (y * h), image.width * scale, image.height * scale);

		return canvas;
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
		const puzzle = Object.create(Puzzle.prototype);
		puzzle.image = image;
		puzzle.width = image.width;
		puzzle.height = image. height;
		puzzle.c = save.c;
		puzzle.r = save.r;
		puzzle.w = image.width / puzzle.c;
		puzzle.h = image.height / puzzle.r;
		puzzle.horizontal = save.horizontal;
		puzzle.vertical = save.vertical;
		return puzzle;
	}
}

