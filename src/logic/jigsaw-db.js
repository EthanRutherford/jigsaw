const imagesTable = "images";
const puzzlesTable = "puzzle";
const gamesTable = "game";

// opens the database, initializing it if necessary
function openDatabase() {
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

// core database interactions
function getCore(objectStore, id) {
	return new Promise((resolve, reject) => {
		const request = objectStore.get(id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function listCore(objectStore) {
	return new Promise((resolve, reject) => {
		const request = objectStore.openCursor();
		request.onerror = reject;

		const list = [];
		request.onsuccess = function(event) {
			const cursor = event.target.result;
			if (cursor) {
				list.push({id: cursor.key, value: cursor.value});
				cursor.continue();
			} else {
				resolve(list);
			}
		};
	});
}
function addCore(objectStore, object) {
	return new Promise((resolve, reject) => {
		const request = objectStore.add(object);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function putCore(objectStore, id, object) {
	return new Promise((resolve, reject) => {
		const request = objectStore.put(object, id);
		request.onerror = reject;
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
	});
}
function deleteCore(objectStore, id) {
	return new Promise((resolve, reject) => {
		const request = objectStore.delete(id);
		request.onerror = reject;
		request.onsuccess = function() {
			resolve();
		};
	});
}

// storage methods
export async function storeImage(blob) {
	const db = await openDatabase();
	const transaction = db.transaction([imagesTable], "readwrite");
	const imageStore = transaction.objectStore(imagesTable);
	return await addCore(imageStore, blob);
}
export async function storePuzzle(puzzle) {
	const db = await openDatabase();
	const transaction = db.transaction([puzzlesTable], "readwrite");
	const puzzleStore = transaction.objectStore(puzzlesTable);
	return await addCore(puzzleStore, puzzle);
}
export async function storeGame(id, game) {
	const db = await openDatabase();
	const transaction = db.transaction([gamesTable], "readwrite");
	const gameStore = transaction.objectStore(gamesTable);
	return await putCore(gameStore, id, game);
}

// list methods
export async function getImageList() {
	const db = await openDatabase();
	const transaction = db.transaction([imagesTable]);
	const imageStore = transaction.objectStore(imagesTable);
	return await listCore(imageStore);
}
export async function getGameList() {
	const db = await openDatabase();
	const transaction = db.transaction([imagesTable, puzzlesTable, gamesTable]);
	const imageStore = transaction.objectStore(imagesTable);
	const puzzleStore = transaction.objectStore(puzzlesTable);
	const gameStore = transaction.objectStore(gamesTable);
	const list = await listCore(gameStore);
	return await Promise.all(list.map(async (item) => {
		item.value.image = await getCore(imageStore, item.value.imageId);
		item.value.puzzle = await getCore(puzzleStore, item.value.puzzleId);
		return item;
	}));
}

// delete methods
async function getGamesUsingImageCore(gameStore, imageId) {
	return (await listCore(gameStore)).filter((g) => g.value.imageId === imageId);
}

export async function getGamesUsingImageCount(id) {
	const db = await openDatabase();
	const transaction = db.transaction([gamesTable], "readwrite");
	const gameStore = transaction.objectStore(gamesTable);
	return (await getGamesUsingImageCore(gameStore, id)).length;
}
export async function deleteImage(id) {
	const db = await openDatabase();
	const transaction = db.transaction([imagesTable, puzzlesTable, gamesTable], "readwrite");
	const imageStore = transaction.objectStore(imagesTable);
	const puzzleStore = transaction.objectStore(puzzlesTable);
	const gameStore = transaction.objectStore(gamesTable);

	const gamesUsingImage = await getGamesUsingImageCore(gameStore, id);
	await deleteCore(imageStore, id);
	for (const game of gamesUsingImage) {
		await deleteCore(gameStore, game.id);
		await deleteCore(puzzleStore, game.value.puzzleId);
	}
}
export async function deleteGame(id) {
	const db = await openDatabase();
	const transaction = db.transaction([puzzlesTable, gamesTable], "readwrite");
	const puzzleStore = transaction.objectStore(puzzlesTable);
	const gameStore = transaction.objectStore(gamesTable);

	const game = await getCore(gameStore, id);
	await deleteCore(puzzleStore, game.puzzleId);
	await deleteCore(gameStore, id);
}

// image utilities
export function canvasToBlob(canvas) {
	return new Promise((resolve) => {
		canvas.toBlob(resolve);
	});
}
export function imageToBlob(image) {
	const canvas = document.createElement("canvas");
	canvas.width = image.width;
	canvas.height = image.height;
	const context = canvas.getContext("2d");
	context.drawImage(image, 0, 0);
	return canvasToBlob(canvas);
}
export function blobToImage(blob) {
	return new Promise((resolve) => {
		const image = new Image();
		image.src = URL.createObjectURL(blob);
		image.onload = () => resolve(image);
	});
}

// since savegames and puzzles are in separate tables,
// they could become orphaned. This checks for and removes
// orphaned puzzles each time the app is loaded up.
(async () => {
	const db = await openDatabase();
	const transaction = db.transaction([puzzlesTable, gamesTable], "readwrite");
	const puzzleStore = transaction.objectStore(puzzlesTable);
	const gameStore = transaction.objectStore(gamesTable);

	// get set of puzzleIds that have savegames
	const puzzles = new Set((await listCore(gameStore)).map((g) => g.value.puzzleId));
	for (const puzzle of await listCore(puzzleStore)) {
		if (!puzzles.has(puzzle.id)) {
			deleteCore(puzzleStore, puzzle.id);
		}
	}
})();
