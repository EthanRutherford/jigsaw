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

	if (savedString != null) {
		return JSON.parse(savedString);
	}

	return {
		bgColor: {r: 40, g: 40, b: 40, a: 1},
		panScale: 1,
	};
}

export function saveSettings(settings) {
	localStorage.setItem(settingsKey, JSON.stringify(settings));
	for (const listener of listeners) {
		listener(settings);
	}
}
