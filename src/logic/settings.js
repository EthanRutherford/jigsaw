// listen to settings changes
const listeners = new Set();
export function addSettingsListener(listener) {
	listeners.add(listener);
}
export function removeSettingsListener(listener) {
	listeners.delete(listener);
}

// save/load methods
const settingsKey = "jigsaw-settings";
export function loadSettings() {
	const savedString = localStorage.getItem(settingsKey);
	const settings = {
		bgColor: {r: 40, g: 40, b: 40, a: 1},
		zoomScale: 1,
		panScale: 1,
		mpColor: {r: 50, g: 100, b: 200, a: 1},
		name: "puzzler",
	};

	if (savedString != null) {
		return Object.assign(settings, JSON.parse(savedString));
	}

	return settings;
}

export function saveSettings(settings) {
	localStorage.setItem(settingsKey, JSON.stringify(settings));
	for (const listener of listeners) {
		listener(settings);
	}
}
