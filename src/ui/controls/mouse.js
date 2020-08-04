import {loadSettings, addSettingsListener} from "../../logic/settings";

let zoomScale = loadSettings().zoomScale;
let panScale = loadSettings().panScale;
addSettingsListener((settings) => {
	zoomScale = settings.zoomScale;
	panScale = settings.panScale;
});

export function mouseZoomPan(game, event) {
	// attempt to normalize wheel event data; some bits borrowed from
	// https://gist.github.com/akella/11574989a9f3cc9e0ad47e401c12ccaf

	let dx = -event.deltaX;
	let dy = -event.deltaY;

	// the shift key turns vertical scrolling into horizontal.
	// also, some trackpads (unfortunately) use this to do side scrolling
	if (event.shiftKey) {
		dx = dy;
		dy = 0;
	}

	// zoom/pan logic
	if (event.ctrlKey) {
		// as a last resort, since zoom speeds are unpredictable,
		// allow user to manually adjust zoom speed
		dx *= zoomScale;
		dy *= zoomScale;

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
		// as a last resort, since zoom speeds are unpredictable,
		// allow user to manually adjust pan speed
		dx *= panScale;
		dy *= panScale;

		// pan
		game.camera.x -= dx * game.camera.zoom / 1000;
		game.camera.y += dy * game.camera.zoom / 1000;
	}
}
