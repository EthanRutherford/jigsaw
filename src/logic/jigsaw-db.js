const imagesTable = "images";
const puzzlesTable = "puzzle";
const gamesTable = "game";

export function openDatabase() {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("jigsaw", 1);

		request.onupgradeneeded = function(event) {
			const database = event.target.result;

			// drop existing tables
			for (const name of database.objectStoreNames) {
				database.deleteObjectStore(name);
			}

			// create table for images
			database.createObjectStore(imagesTable, {autoIncrement: true});

			// create table for puzzle
			database.createObjectStore(puzzlesTable, {autoIncrement: true});

			// create table for game
			database.createObjectStore(gamesTable, {autoIncrement: true});
		};

		request.onerror = reject;
		request.onsuccess = function() {
			resolve(this.result);
		};
	});
}

function simpleAdd(db, table, object) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([table], "readwrite");
		const objectStore = transaction.objectStore(table);

		const request = objectStore.add(object);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function simpleGet(db, table, id) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([table]);
		const objectStore = transaction.objectStore(table);

		const request = objectStore.get(id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}

export function storeImage(db, blob) {
	return simpleAdd(db, imagesTable, blob);
}

export function storePuzzle(db, puzzle) {
	return simpleAdd(db, puzzlesTable, puzzle);
}

export function storeGame(db, game, id) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([gamesTable], "readwrite");
		const objectStore = transaction.objectStore(gamesTable);

		const request = objectStore.put(game, id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}

export function getImage(db, id) {
	return simpleGet(db, imagesTable, id);
}

export function getPuzzle(db, id) {
	return simpleGet(db, puzzlesTable, id);
}

export function getGame(db, id) {
	return new Promise((resolve, reject) => {
		const transaction = db.transaction([imagesTable, puzzlesTable, gamesTable]);
		const gameStore = transaction.objectStore(gamesTable);

		const request = gameStore.get(id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			const game = event.target.result;

			let resultCount = 0;

			const imageStore = transaction.objectStore(imagesTable);
			const imageRequest = imageStore.get(game.imageId);
			imageRequest.onerror = reject;
			imageRequest.onsuccess = function(event) {
				game.image = event.target.result;
				if (++resultCount === 2) resolve(game);
			};

			const puzzleStore = transaction.objectStore(puzzlesTable);
			const puzzleRequest = puzzleStore.get(game.imageId);
			puzzleRequest.onerror = reject;
			puzzleRequest.onsuccess = function(event) {
				game.puzzle = event.target.result;
				if (++resultCount === 2) resolve(game);
			};
		};
	});
}

// image utilities
export function imageToBlob(image) {
	return new Promise((resolve) => {
		const canvas = document.createElement("canvas");
		canvas.width = image.width;
		canvas.height = image.height;
		const context = canvas.getContext("2d");
		context.drawImage(image, 0, 0);
		canvas.toBlob(resolve);
	});
}

export function blobToImage(blob) {
	return new Promise((resolve) => {
		const image = new Image();
		image.src = URL.createObjectURL(blob);
		image.onload = () => resolve(image);
	});
}
