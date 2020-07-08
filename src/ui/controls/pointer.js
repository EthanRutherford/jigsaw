const pStates = {
	none: 0,
	piece: 1,
	camera: 2,
};

function initDragPointer(hit, pos) {
	for (const piece of hit.group.pieces) {
		piece.zIndex = 999;
	}

	return {
		root: hit,
		moved: false,
		start: Date.now(),
		offset: {x: hit.x - pos.x, y: hit.y - pos.y},
	};
}

function updatePointer(pointer, event) {
	pointer.pointerId = event.pointerId;
	pointer.offsetX = event.offsetX;
	pointer.offsetY = event.offsetY;
	pointer.shiftKey = event.shiftKey;
	return pointer;
}

function dragGroup(game, pointer) {
	const pos = game.viewportToWorld(pointer.offsetX, pointer.offsetY);
	pointer.root.moveTo(pos.x + pointer.offset.x, pos.y + pointer.offset.y);
	pointer.moved = true;
}

function dropGroup(game, pointer) {
	// apply rotation if this was a tap
	if (Date.now() - pointer.start < 100 || !pointer.moved) {
		const diff = pointer.shiftKey ? 1 : -1;
		let newOrientation = (pointer.root.orientation + diff) % 4;
		if (newOrientation === -1) newOrientation = 3;

		pointer.root.rotate(newOrientation);
	}

	// place pieces down
	game.placePieces(pointer.root);
}

function dragCamera(game, [p1, p2]) {
	if (p2 == null) {
		const curPos = game.viewportToWorld(p1.offsetX, p1.offsetY);
		game.camera.x += p1.pos.x - curPos.x;
		game.camera.y += p1.pos.y - curPos.y;
	} else {
		const curPos1 = game.viewportToWorld(p1.offsetX, p1.offsetY);
		const curPos2 = game.viewportToWorld(p2.offsetX, p2.offsetY);

		const correctDist = Math.sqrt((p1.pos.x - p2.pos.x) ** 2 + (p1.pos.y - p2.pos.y) ** 2);
		const actualDist = Math.sqrt((curPos1.x - curPos2.x) ** 2 + (curPos1.y - curPos2.y) ** 2);

		const ratio = correctDist / actualDist;
		game.camera.zoom = Math.max(2, Math.min(50, game.camera.zoom * ratio));

		// maintain world position of centroid
		const newPos1 = game.viewportToWorld(p1.offsetX, p1.offsetY);
		const newPos2 = game.viewportToWorld(p2.offsetX, p2.offsetY);

		const curCenter = {
			x: (curPos1.x + curPos2.x) / 2,
			y: (curPos1.y + curPos2.y) / 2,
		};

		const newCenter = {
			x: (newPos1.x + newPos2.x) / 2,
			y: (newPos1.y + newPos2.y) / 2,
		};

		game.camera.x += curCenter.x - newCenter.x;
		game.camera.y += curCenter.y - newCenter.y;
	}
}

export function setupPointerControls(game, canvas) {
	let pState = pStates.none;
	const pList = [];

	canvas.addEventListener("pointerdown", (event) => {
		event.preventDefault();

		if (pState === pStates.none) {
			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			const hit = game.query(pos);

			if (hit != null) {
				pState = pStates.piece;
				pList.push(updatePointer(initDragPointer(hit, pos), event));
			} else {
				pState = pStates.camera;
				pList.push(updatePointer({pos}, event));
			}
		} else if (pState === pStates.camera && pList.length === 1) {
			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			pList.push(updatePointer({pos}, event));
		}
	});

	canvas.addEventListener("pointermove", (event) => {
		event.preventDefault();

		if (pState === pStates.piece && event.pointerId === pList[0].pointerId) {
			updatePointer(pList[0], event);
			dragGroup(game, pList[0]);
		} else if (pState === pStates.camera) {
			const index = pList.findIndex((p) => p.pointerId === event.pointerId);
			if (index !== -1) {
				updatePointer(pList[index], event);
				dragCamera(game, pList);
			}
		}
	});

	function handlePointerUp(event) {
		event.preventDefault();

		if (pState === pStates.piece && event.pointerId === pList[0].pointerId) {
			updatePointer(pList[0], event);
			dropGroup(game, pList[0]);
			pList.pop();
			pState = pStates.none;
		} else if (pState === pStates.camera) {
			const index = pList.findIndex((p) => p.pointerId === event.pointerId);
			if (index !== -1) {
				pList.splice(index, 1);
				if (pList.length === 0) {
					pState = pStates.none;
				} else {
					// re-pin remaining touch point to current position
					pList[0].pos = game.viewportToWorld(event.offsetX, event.offsetY);
				}
			}
		}
	}

	document.addEventListener("pointerup", handlePointerUp);
	return () => document.removeEventListener("pointerup", handlePointerUp);
}
