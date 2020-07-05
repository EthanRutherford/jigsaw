export function randFloat(min, max) {
	return min + Math.random() * (max - min);
}

export function randChance(percent) {
	return Math.random() < percent;
}
