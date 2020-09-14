function initDragPointer(game, hit, pos) {
	game.grabPieces(hit);

	return {
		pos,
		root: hit,
		start: Date.now(),
		travel: 0,
		originalOffset: {x: hit.x - pos.x, y: hit.y - pos.y},
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
	const curPos = game.viewportToWorld(pointer.offsetX, pointer.offsetY);
	const newX = curPos.x + pointer.originalOffset.x;
	const newY = curPos.y + pointer.originalOffset.y;
	pointer.travel += Math.sqrt((newX - pointer.root.x) ** 2 + (newY - pointer.root.y) ** 2);
	pointer.root.moveTo(newX, newY);
}

function dropGroup(game, pointer) {
	// apply rotation if this was a tap
	const elapsed = Date.now() - pointer.start;
	const quickTap = elapsed < 200 && pointer.travel < .2;
	const notMoved = elapsed < 1000 && pointer.travel < .01;
	if (!pointer.root.group.frozen && (quickTap || notMoved)) {
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
		game.setZoom(game.camera.zoom * ratio);

		// maintain world position of centroid
		const newPos1 = game.viewportToWorld(p1.offsetX, p1.offsetY);
		const newPos2 = game.viewportToWorld(p2.offsetX, p2.offsetY);

		const prevCenter = {
			x: (p1.pos.x + p2.pos.x) / 2,
			y: (p1.pos.y + p2.pos.y) / 2,
		};

		const newCenter = {
			x: (newPos1.x + newPos2.x) / 2,
			y: (newPos1.y + newPos2.y) / 2,
		};

		game.camera.x += prevCenter.x - newCenter.x;
		game.camera.y += prevCenter.y - newCenter.y;
	}
}

export function setupPointerControls(game, canvas) {
	const pList = [];

	canvas.addEventListener("pointerdown", (event) => {
		event.preventDefault();

		if (pList.length === 0) {
			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			const hit = game.query(pos);

			if (hit != null) {
				pList.push(updatePointer(initDragPointer(game, hit, pos), event));
			} else {
				pList.push(updatePointer({pos}, event));
			}
		} else {
			// ignore duplicates
			if (pList.find((p) => p.pointerId === event.pointerId)) {
				return;
			}

			const pos = game.viewportToWorld(event.offsetX, event.offsetY);
			pList.push(updatePointer({pos}, event));
		}
	});

	canvas.addEventListener("pointermove", (event) => {
		event.preventDefault();

		const pos = game.viewportToWorld(event.offsetX, event.offsetY);
		if (pList.length === 1 && pList[0].root != null) {
			updatePointer(pList[0], event);
			dragGroup(game, pList[0]);

			game.handlePointer(pos, pList[0].root);
		} else {
			const index = pList.findIndex((p) => p.pointerId === event.pointerId);
			if (index !== -1) {
				updatePointer(pList[index], event);
				dragCamera(game, pList);
			}

			game.handlePointer(pos);
		}
	});

	function handlePointerUp(event) {
		event.preventDefault();

		const index = pList.findIndex((p) => p.pointerId === event.pointerId);
		if (index !== -1) {
			const pointer = pList.splice(index, 1)[0];
			if (pointer.root != null) {
				updatePointer(pointer, event);
				dropGroup(game, pointer);
				game.save();
			}

			// re-pin remaining touch points to their current positions
			for (const pointer of pList) {
				pointer.pos = game.viewportToWorld(pointer.offsetX, pointer.offsetY);
			}
		}
	}

	game.preRender = (elapsed) => {
		if (pList.length !== 1 || pList[0].root == null) {
			return;
		}

		const timeScale = elapsed / 20;

		// if close to the edge of the screen, scroll screen
		let moved = false;
		const {width, height} = game.renderer.canvas;
		const x = pList[0].offsetX / width;
		const y = 1 - (pList[0].offsetY / height);
		if (x < .05 || x > .95) {
			const v = x - .5;
			const scale = v - Math.sign(v) * .45;
			game.camera.x += scale * game.camera.zoom * timeScale;
			moved = true;
		}
		if (y < .05 || y > .95) {
			const v = y - .5;
			const scale = v - Math.sign(v) * .45;
			game.camera.y += scale * game.camera.zoom * timeScale;
			moved = true;
		}

		if (moved) {
			dragGroup(game, pList[0]);
		}
	};

	document.addEventListener("pointerup", handlePointerUp);
	document.addEventListener("pointercancel", handlePointerUp);
	return () => {
		document.removeEventListener("pointerup", handlePointerUp);
		document.removeEventListener("pointercancel", handlePointerUp);
	};
}
