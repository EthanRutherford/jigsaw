import bezier from "adaptive-bezier-curve";
import earcut from "earcut";
import {reverseEdge} from "./generate";

function mapCurve(start, curve, x, y) {
	return [
		start,
		[x + curve.c0.x, y + curve.c0.y],
		[x + curve.c1.x, y + curve.c1.y],
		[x + curve.to.x, y + curve.to.y],
	];
}
function mapLooseHori(curve, x, y) {
	return [
		[x + curve[0].to.x, y + curve[0].to.y],
		[x + curve[0].to.x, y + curve[1].to.y],
		[x + curve[2].to.x, y + curve[1].to.y],
		[x + curve[2].to.x, y + curve[2].to.y],
		[x + curve[3].to.x, y + curve[3].to.y],
	];
}
function mapLooseVert(curve, x, y) {
	return [
		[x + curve[0].to.x, y + curve[0].to.y],
		[x + curve[1].to.x, y + curve[0].to.y],
		[x + curve[1].to.x, y + curve[2].to.y],
		[x + curve[2].to.x, y + curve[2].to.y],
		[x + curve[3].to.x, y + curve[3].to.y],
	];
}

function makePiece(horizontal, vertical, w, h, c, r, x, y) {
	const points = [[0, 0]];
	const loosePoints = [[0, 0]];

	// draw top edge
	if (y === 0) {
		points.push([1, 0]);
		loosePoints.push([1, 0]);
	} else {
		const edge = horizontal[y - 1][x];

		for (const curve of edge) {
			const mappedCurve = mapCurve(points.pop(), curve, 0, 0);
			points.push(...bezier(...mappedCurve, 100));
		}

		loosePoints.push(...mapLooseHori(edge, 0, 0));
	}

	// draw right edge
	if (x === c - 1) {
		points.push([1, 1]);
		loosePoints.push([1, 1]);
	} else {
		const edge = vertical[x][y];

		for (const curve of edge) {
			const mappedCurve = mapCurve(points.pop(), curve, 1, 0);
			points.push(...bezier(...mappedCurve, 100));
		}

		loosePoints.push(...mapLooseVert(edge, 1, 0));
	}

	// draw bottom edge
	if (y === r - 1) {
		points.push([0, 1]);
		loosePoints.push([0, 1]);
	} else {
		const edge = reverseEdge(horizontal[y][x], 0, 0);

		for (const curve of edge) {
			const mappedCurve = mapCurve(points.pop(), curve, 0, 1);
			points.push(...bezier(...mappedCurve, 100));
		}

		loosePoints.push(...mapLooseHori(edge, 0, 1));
	}

	// draw left edge
	if (x === 0) {
		points.push([0, 0]);
		loosePoints.push([0, 0]);
	} else {
		const edge = reverseEdge(vertical[x - 1][y], 0, 0);

		for (const curve of edge) {
			const mappedCurve = mapCurve(points.pop(), curve, 0, 0);
			points.push(...bezier(...mappedCurve, 100));
		}

		loosePoints.push(...mapLooseVert(edge, 0, 0));
	}

	points.pop();
	loosePoints.pop();
	const tris = earcut(points.flat());

	const vw = 1;
	const vh = h / w;
	const vhw = vw / 2;
	const vhh = vh / 2;
	const mVerts = points.map(([x, y]) => ({x: x * vw - vhw, y: (1 - y) * vh - vhh}));
	const mLoose = loosePoints.map(([x, y]) => ({x: x * vw - vhw, y: (1 - y) * vh - vhh}));

	const cw = 1 / c;
	const ch = 1 / r;
	const left = cw * x;
	const bottom = ch * (r - 1 - y);
	const mCoords = points.map(([x, y]) => ({x: left + x * cw, y: bottom + (1 - y) * ch}));

	return {
		verts: tris.map((i) => mVerts[i]),
		tCoords: tris.map((i) => mCoords[i]),
		loose: mLoose,
	};
}

onmessage = function(event) {
	const {horizontal, vertical, w, h, c, r} = event.data;

	const pieces = [];
	for (let i = 0; i < c; i++) {
		for (let j = 0; j < r; j++) {
			pieces.push(makePiece(horizontal, vertical, w, h, c, r, i, j));
		}
	}

	postMessage(pieces);
};
