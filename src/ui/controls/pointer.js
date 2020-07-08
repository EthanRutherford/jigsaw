const pStates = {
	none: 0,
	piece: 1,
	camera: 2,
};

function initDragGroup(hit, pos) {
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

function dragGroup(game, pointer, pData) {
	const pos = game.viewportToWorld(pointer.offsetX, pointer.offsetY);
	pData.root.moveTo(pos.x + pData.offset.x, pos.y + pData.offset.y);
	pData.moved = true;
}

function dropGroup(game, pointer, pData) {
	// apply rotation if this was a tap
	if (Date.now() - pData.start < 100 || !pData.moved) {
		const diff = pointer.shiftKey ? 1 : -1;
		let newOrientation = (pData.root.orientation + diff) % 4;
		if (newOrientation === -1) newOrientation = 3;

		pData.root.rotate(newOrientation);
	}

	// place pieces down
	game.placePieces(pData.root);
}

function dragCamera(game, [p1, p2], pData) {
	if (p2 == null) {
		const curPos = game.viewportToWorld(p1.offsetX, p1.offsetY);
		game.camera.x += pData.pos.x - curPos.x;
		game.camera.y += pData.pos.y - curPos.y;
	} else {
		// TODO: handle pinch-zoom
	}
}

export function setupPointerControls(game, canvas) {
	let pState = pStates.none;
	let pData = null;
	const pList = [];

	canvas.addEventListener("pointerdown", (event) => {
		event.preventDefault();

		if (pState === pStates.none) {
			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			const hit = game.query(pos);

			if (hit != null) {
				pState = pStates.piece;
				pData = initDragGroup(hit, pos);
			} else {
				pState = pStates.camera;
				pData = {pos};
			}

			pList.push(event);
		} else if (pState === pStates.camera && pList.length === 1) {
			pList.push(event);
		}
	});

	canvas.addEventListener("pointermove", (event) => {
		event.preventDefault();

		if (pState === pStates.piece && event.pointerId === pList[0].pointerId) {
			dragGroup(game, event, pData);
		} else if (pState === pStates.camera) {
			const index = pList.findIndex((p) => p.pointerId === event.pointerId);
			if (index !== -1) {
				pList[index] = event;
				dragCamera(game, pList, pData);
			}
		}
	});

	function handlePointerUp(event) {
		event.preventDefault();

		if (pState === pStates.piece) {
			dropGroup(game, event, pData);
			pList.pop();
			pState = pStates.none;
		} else if (pState === pStates.camera) {
			const index = pList.findIndex((p) => p.pointerId === event.pointerId);
			if (index !== -1) {
				pList.splice(index, 1);
				if (pList.length === 0) {
					pState = pStates.none;
				}
			}
		}
	}

	document.addEventListener("pointerup", handlePointerUp);
	return () => document.removeEventListener("pointerup", handlePointerUp);
}
