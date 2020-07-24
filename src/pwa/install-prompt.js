let deferredPrompt = null;
let listener = null;

window.addEventListener("beforeinstallprompt", (event) => {
	event.preventDefault();
	deferredPrompt = event;

	if (listener instanceof Function) {
		listener();
	}
});

export function notifyCanPrompt(func) {
	listener = func;
	if (listener && deferredPrompt) {
		listener();
	}
}

export function promptForInstall() {
	deferredPrompt.prompt();

	return deferredPrompt.userChoice.then((choiceResult) => {
		deferredPrompt = null;

		return choiceResult.outcome === "accepted";
	});
}
