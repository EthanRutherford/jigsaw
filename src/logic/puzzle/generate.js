import {randFloat, randChance} from "../random";

function makeEdge(prevControl) {
	// an edge of a puzzle piece is defined by 4 consecutive bezier curves
	// the edge is normalized to the range 0-1

	// choose "nub" parameters
	const nubHeight = randFloat(.15, .25);
	const nubWidth = randFloat(.15, .22);
	const nubOffsetY = randFloat(-.05, .05);
	const nubInset1 = randFloat(.08, .12);
	const nubInset2 = randFloat(.08, .12);
	const nubDir = randChance(.5) ? 1 : -1;

	const p1MinX = .3;
	const p1MaxX = 1 - (.3 + nubWidth);

	// point locations (p0 = [0, 0], p4 = [1, 0])
	const p1 = {x: randFloat(p1MinX, p1MaxX), y: 0};
	const p2 = {x: p1.x + nubWidth / 2, y: nubHeight * nubDir};
	const p3 = {x: p1.x + nubWidth, y: 0};

	// first curve joins previous line to start of nub
	const curve1 = {
		c0: {x: .2, y: -prevControl.y},
		c1: {x: p1.x, y: nubInset1 * -nubDir},
		to: p1,
	};

	// curve up from the line to the tip of the nub
	const curve2 = {
		c0: {x: p1.x, y: nubInset1 * nubDir},
		c1: {x: p1.x - .1, y: p2.y - nubOffsetY},
		to: p2,
	};

	// curve from the tip of the nub back to the line
	const curve3 = {
		c0: {x: p3.x + .1, y: p2.y + nubOffsetY},
		c1: {x: p3.x, y: nubInset2 * nubDir},
		to: p3,
	};

	// curve from the end of the nub to the end of the line
	const curve4 = {
		c0: {x: p3.x, y: nubInset2 * -nubDir},
		c1: {x: .8, y: randFloat(-.1, .1)},
		to: {x: 1, y: 0},
	};

	return [curve1, curve2, curve3, curve4];
}

function makeLine(length) {
	const edges = [];

	let prevControl = {x: .8, y: randFloat(-.1, .1)};
	for (let i = 0; i < length; i++) {
		const edge = makeEdge(prevControl);
		edges.push(edge);
		prevControl = edge[3].c1;
	}

	return edges;
}

function makeVerticalLine(length) {
	const horizontal = makeLine(length);
	const vertical = [];

	for (const edge of horizontal) {
		const mapped = [];
		for (const curve of edge) {
			mapped.push({
				c0: {x: curve.c0.y, y: curve.c0.x},
				c1: {x: curve.c1.y, y: curve.c1.x},
				to: {x: curve.to.y, y: curve.to.x},
			});
		}

		vertical.push(mapped);
	}

	return vertical;
}

export function reverseEdge(edge, fx, fy) {
	return edge.map((c, i) => {
		const to = i === 0 ? {x: fx, y: fy} : edge[i - 1].to;
		return {c0: c.c1, c1: c.c0, to};
	}).reverse();
}

export function makeLines(width, height) {
	const horizontal = [];
	const vertical = [];

	for (let i = 0; i < height - 1; i++) {
		horizontal.push(makeLine(width));
	}

	for (let i = 0; i < width - 1; i++) {
		vertical.push(makeVerticalLine(height));
	}

	return {horizontal, vertical};
}
