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
