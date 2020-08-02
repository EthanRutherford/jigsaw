import {loadSettings, addSettingsListener} from "../../logic/settings";

let panScale = loadSettings().panScale;
addSettingsListener((settings) => panScale = settings.panScale);

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

	// as a last resort, since zoom speeds are unpredictable, allow user to
	// manually adjust zoom/pan speeds
	dx *= panScale;
	dy *= panScale;

	// zoom/pan logic
	if (event.ctrlKey) {
		// zoom
		const zoomValue = 1 - dy / 1000;
		const offx = event.offsetX, offy = event.offsetY;
		const oldPos = game.viewportToWorld(offx, offy);
		game.setZoom(game.camera.zoom * zoomValue);

		// center zoom on mouse position
		const newPos = game.viewportToWorld(offx, offy);
		game.camera.x += oldPos.x - newPos.x;
		game.camera.y += oldPos.y - newPos.y;
	} else {
		// pan
		game.camera.x -= dx * game.camera.zoom / 1000;
		game.camera.y += dy * game.camera.zoom / 1000;
	}
}
