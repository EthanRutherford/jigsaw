export function randFloat(min, max) {
	return min + Math.random() * (max - min);
}

export function randChance(percent) {
	return Math.random() < percent;
}

export function randInt(min, max) {
	// note: inclusive of max
	return Math.floor(randFloat(min, max + 1));
}

export function randomKey() {
	const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

	let key = "";
	for (let i = 0; i < 5; i++) {
		key += alpha[randInt(0, alpha.length - 1)];
	}

	return key;
}
