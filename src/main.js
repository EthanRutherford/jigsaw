import {Puzzle} from "./logic/puzzle";

async function main() {
	const image = await Puzzle.fetchImage("https://cdn.mos.cms.futurecdn.net/jbCNvTM4gwr2qV8X8fW3ZB.png");
	const puzzle = new Puzzle(image, 20, 10);

	document.body.append(puzzle.drawFullPuzzle());

	document.body.append(puzzle.drawPiece(0, 0));
	document.body.append(puzzle.drawPiece(19, 9));
}

main();
