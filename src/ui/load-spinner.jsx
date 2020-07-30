import React, {useMemo} from "react";
import {makeLines, reverseEdge} from "../logic/puzzle/generate";
import styles from "../styles/spinner.css";

function curve(c0, c1, to, w, h, x, y) {
	return (
		"C " +
		`${c0.x * w + x} ${c0.y * h + y}, ` +
		`${c1.x * w + x} ${c1.y * h + y}, ` +
		`${to.x * w + x} ${to.y * h + y} `
	);
}

function makePiecePath() {
	const {horizontal, vertical} = makeLines(3, 3);
	const top = horizontal[0][1];
	const right = vertical[1][1];
	const bottom = reverseEdge(horizontal[1][1], 0, 0);
	const left = reverseEdge(vertical[0][1], 0, 0);

	let path = "M 25 25 ";
	for (const {c0, c1, to} of top) {
		path += curve(c0, c1, to, 50, 50, 25, 25);
	}
	for (const {c0, c1, to} of right) {
		path += curve(c0, c1, to, 50, 50, 75, 25);
	}
	for (const {c0, c1, to} of bottom) {
		path += curve(c0, c1, to, 50, 50, 25, 75);
	}
	for (const {c0, c1, to} of left) {
		path += curve(c0, c1, to, 50, 50, 25, 25);
	}

	return path + "Z";
}

export function LoadSpinner() {
	const path = useMemo(makePiecePath);

	return (
		<svg className={styles.spinner} viewBox="0 0 100 100">
			<path
				d={path}
				strokeWidth="2"
				stroke="currentColor"
				fill="transparent"
			/>
		</svg>
	);
}
