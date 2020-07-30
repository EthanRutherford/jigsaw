import {pieceSkinWidth} from "../constants";
import {reverseEdge} from "./generate";

function drawEdge(context, edge, w, h, x, y) {
	for (const curve of edge) {
		context.bezierCurveTo(
			x + curve.c0.x * w, y + (curve.c0.y * h),
			x + curve.c1.x * w, y + (curve.c1.y * h),
			x + curve.to.x * w, y + (curve.to.y * h),
		);
	}
}

function makeShadow(piece, shadow) {
	shadow.width = piece.width;
	shadow.height = piece.height;
	const context = shadow.getContext("2d");
	context.globalAlpha = .25;
	context.drawImage(piece, 0, 0);
	return shadow;
}

function drawPiece(image, pair, horizontal, vertical, width, height, scale, c, r, rw, rh, x, y) {
	const [piece, shadow] = pair;
	const skinW = Math.ceil(width * pieceSkinWidth);
	const skinH = Math.ceil(height * pieceSkinWidth);
	piece.width = skinW * 2 + width;
	piece.height = skinH * 2 + height;

	// for the right-most and bottom-most pieces, add the extra pixels
	// also, draw each piece a tiny bit oversized to help seams render well
	const w = width + (x === c - 1 ? rw : 0) + 2;
	const h = height + (y === r - 1 ? rh : 0) + 2;

	const left = skinW - 1;
	const right = skinW - 1 + w;
	const top = skinH - 1;
	const bottom = skinH - 1 + h;

	const context = piece.getContext("2d");
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

	// make shadow from current state
	makeShadow(piece, shadow);

	// paint image into the piece
	context.globalCompositeOperation = "source-in";
	context.imageSmoothingEnabled = false;
	context.drawImage(image, left - (x * width), top - (y * height), image.width * scale, image.height * scale);
}

onmessage = function(event) {
	const {image, canvases, horizontal, vertical, width, height, scale, c, r, rw, rh} = event.data;

	for (let i = 0; i < c; i++) {
		for (let j = 0; j < r; j++) {
			const pair = canvases[i * r + j];
			drawPiece(
				image, pair, horizontal, vertical, width, height, scale, c, r, rw, rh, i, j,
			);
		}
	}

	requestAnimationFrame(() => postMessage("done"));
};
