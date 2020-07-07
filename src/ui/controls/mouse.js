export function mouseZoomPan(game, event) {
	// attempt to normalize wheel event data; some bits borrowed from
	// https://gist.github.com/akella/11574989a9f3cc9e0ad47e401c12ccaf

	let dx = event.wheelDeltaX;
	let dy = event.wheelDeltaY;

	// if the above are null, we're probably in firefox: fallback to deltas
	if (dx == null || dy == null) {
		dx = -event.deltaX * 50;
		dy = -event.deltaY * 50;
	}

	// the shift key turns vertical scrolling into horizontal.
	// also, some trackpads (unfortunately) use this to do side scrolling
	if (event.shiftKey) {
		dx = dy;
		dy = 0;
	}

	// zoom/pan logic
	if (event.ctrlKey) {
		// zoom
		const offx = event.offsetX, offy = event.offsetY;
		const oldPos = game.viewportToWorld(offx, offy);
		game.camera.zoom = Math.max(2, Math.min(50, game.camera.zoom - dy / 100));

		// center zoom on mouse position
		const newPos = game.viewportToWorld(offx, offy);
		game.camera.x += oldPos.x - newPos.x;
		game.camera.y += oldPos.y - newPos.y;
	} else {
		// pan
		game.current.camera.x -= dx * game.camera.zoom / 1000;
		game.current.camera.y += dy * game.camera.zoom / 1000;
	}
}

export function mouseDragGroup(game, canvas, rootPiece, pos) {
	const mouseDownStamp = Date.now();
	let moved = false;

	// lift the group of pieces
	const offset = {x: rootPiece.x - pos.x, y: rootPiece.y - pos.y};
	for (const piece of rootPiece.group.pieces) {
		piece.zIndex = 999;
	}

	// handle dragging the group
	function mouseMove(event) {
		event.preventDefault();

		// move the piece(s)
		const pos = game.viewportToWorld(event.offsetX, event.offsetY);
		rootPiece.moveTo(pos.x + offset.x, pos.y + offset.y);
		moved = true;
	}

	// handle end of drag
	function mouseUp(event) {
		event.preventDefault();

		// apply rotation if this was a tap
		if (Date.now() - mouseDownStamp < 100 || !moved) {
			const diff = event.shiftKey ? 1 : -1;
			let newOrientation = (rootPiece.orientation + diff) % 4;
			if (newOrientation === -1) newOrientation = 3;

			rootPiece.rotate(newOrientation);
		}

		// place pieces down
		game.placePieces(rootPiece);

		canvas.removeEventListener("mousemove", mouseMove);
		canvas.removeEventListener("mouseup", mouseUp);
	}

	canvas.addEventListener("mousemove", mouseMove);
	canvas.addEventListener("mouseup", mouseUp);
}

export function mouseDragCamera(game, canvas, pos) {
	function mouseMove(event) {
		event.preventDefault();

		const curPos = game.viewportToWorld(event.offsetX, event.offsetY);
		game.camera.x += pos.x - curPos.x;
		game.camera.y += pos.y - curPos.y;
	}

	function mouseUp() {
		event.preventDefault();

		canvas.removeEventListener("mousemove", mouseMove);
		canvas.removeEventListener("mouseup", mouseUp);
	}

	canvas.addEventListener("mousemove", mouseMove);
	canvas.addEventListener("mouseup", mouseUp);
}
