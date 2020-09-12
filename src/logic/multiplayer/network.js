import {dataUrlToImage, imageToDataUrl} from "../jigsaw-db";
import {Puzzle} from "../puzzle/puzzle";
import {PeerManager} from "./peer";

const wsBaseUrl = "wss://signal.rutherford.site";

function segmentMessage(message) {
	const segmentSize = 8000;
	const segments = [];
	while (message.length > 0) {
		const segment = message.slice(0, segmentSize);
		message = message.slice(segmentSize);
		segments.push(segment);
	}

	segments.push("done");
	return segments;
}
function sendSegments(channel, segments) {
	for (const segment of segments) {
		channel.send(segment);
	}
}

function updatePiece(game, update) {
	const piece = game.pieces[update.id];
	piece.x = update.x;
	piece.y = update.y;
	piece.orientation = update.o;
	return piece;
}

class Node {
	constructor(roomKey, isHost) {
		const name = `jigsaw-${roomKey}`;
		this.peerManager = new PeerManager(wsBaseUrl, name, isHost);
		this.selfId = "-1";
		this.peers = {[this.selfId]: {x: 0, y: 0}};
		this.peerManager.onidchange = (newId) => {
			this.peers[newId] = this.peers[this.selfId];
			delete this.peers[this.selfId];
			this.selfId = newId;
		};

		this.imageChannel = this.peerManager.createDataChannel("image");
		this.puzzleChannel = this.peerManager.createDataChannel("puzzle");
		this.gameChannel = this.peerManager.createDataChannel("game");
	}
	setup(game) {
		this.game = game;
		game.mp = this;
		this.interval = setInterval(() => this.sendUpdate(), 33);
	}
	getCursors() {
		return Object.entries(this.peers).filter(
			([id]) => Number.parseInt(id, 10) !== this.selfId,
		).map(([, peer]) => ({x: peer.x, y: peer.y}));
	}
	close() {
		clearInterval(this.interval);
		this.peerManager.close();
	}
}

export class Host extends Node {
	constructor(roomKey) {
		super(roomKey, true);
		this.gameChannel.onmessage = (event) => this.handleMessage(
			event.peerId, JSON.parse(event.data),
		);

		// temporarily manage peers, until the game actually starts
		this.peerManager.onpeerconnected = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0};
		};
		this.peerManager.onpeerlost = (peerId) => {
			delete this.peers[peerId];
		};
	}
	setup(game, puzzle) {
		const dataUrlSegments = segmentMessage(imageToDataUrl(puzzle.image));
		const puzzleSegments = segmentMessage(JSON.stringify({
			h: puzzle.horizontal,
			v: puzzle.vertical,
			p: game.getPieces(),
		}));

		sendSegments(this.imageChannel, dataUrlSegments);
		sendSegments(this.puzzleChannel, puzzleSegments);
		this.peerManager.onpeerconnected = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0};
			sendSegments(this.imageChannel, dataUrlSegments);
			sendSegments(this.puzzleChannel, puzzleSegments);
		};
		this.peerManager.onpeerlost = (peerId) => {
			const peer = this.peers[peerId];
			delete this.peers[peerId];

			if (peer.piece != null) {
				const piece = this.game.pieces[peer.piece.id];
				this.game.placePieces(piece, false);
			}
		};

		super.setup(game);
	}
	handleMessage(peerId, message) {
		const peer = this.peers[peerId];
		if (message.x != null && message.y != null) {
			peer.x = message.x;
			peer.y = message.y;
		}

		if (message.piece != null) {
			peer.piece = message.piece;
			updatePiece(this.game, message.piece);
		}

		if (message.grab != null) {
			peer.piece = message.grab;
			const piece = updatePiece(this.game, message.grab);
			this.game.grabPieces(piece, false);
		}

		if (message.drop != null) {
			delete peer.piece;
			const piece = updatePiece(this.game, message.drop);
			this.game.placePieces(piece, false);
		}
	}
	handlePointer(pos, piece) {
		this.peers[this.selfId].x = pos.x;
		this.peers[this.selfId].y = pos.y;

		if (piece != null) {
			this.peers[this.selfId].piece = {
				id: piece.id,
				x: piece.x,
				y: piece.y,
				o: piece.orientation,
			};
		}
	}
	handleGrab(piece) {
		this.peers[this.selfId].piece = {
			id: piece.id,
			x: piece.x,
			y: piece.y,
			o: piece.orientation,
		};
	}
	handleDrop() {
		delete this.peers[this.selfId].piece;
	}
	sendUpdate() {
		const messageSegments = segmentMessage(JSON.stringify({
			pieces: this.game.pieces.map((p) => ({
				id: p.id, x: p.x, y: p.y, o: p.orientation, g: p.group.id,
			})),
			peers: this.peers,
		}));

		sendSegments(this.gameChannel, messageSegments);
	}
}

export class Client extends Node {
	constructor(roomKey) {
		super(roomKey, false);
		this.shouldSend = false;

		let update = "";
		this.gameChannel.onmessage = (event) => {
			if (event.data === "done") {
				this.handleMessage(JSON.parse(update));
				update = "";
			} else {
				update += event.data;
			}
		};
	}
	handleMessage(message) {
		if (this.game == null) {
			return;
		}

		const me = this.peers[this.selfId];
		const myPieceId = me.piece != null ? me.piece.id : -1;
		for (const piece of message.pieces) {
			if (piece.id !== myPieceId) {
				updatePiece(this.game, piece);
			}
		}

		const peersToDelete = new Set(Object.keys(this.peers));
		peersToDelete.delete(this.selfId);
		for (const [peerId, peer] of Object.entries(message.peers)) {
			if (peerId === this.selfId) {
				continue;
			}

			const existingPeer = this.peers[peerId];
			if (existingPeer != null) {
				if (existingPeer.piece == null && peer.piece != null) {
					this.game.grabPieces(this.game.pieces[peer.piece.id], false);
				} else if (existingPeer.piece != null && peer.piece == null) {
					this.game.placePieces(this.game.pieces[existingPeer.piece.id], false);
				}
			}

			peersToDelete.delete(peerId);
			this.peers[peerId] = peer;
		}
		for (const peerId of peersToDelete) {
			const existingPeer = this.peers[peerId];
			if (this.peers[peerId].piece != null) {
				this.game.placePieces(this.game.pieces[existingPeer.piece.id], false);
			}

			delete this.peers[peerId];
		}
	}
	handlePointer(pos, piece) {
		this.peers[this.selfId].x = pos.x;
		this.peers[this.selfId].y = pos.y;
		this.shouldSend = true;

		if (piece != null) {
			this.peers[this.selfId].piece = {
				id: piece.id,
				x: piece.x,
				y: piece.y,
				o: piece.orientation,
			};
		}
	}
	handleGrab(piece) {
		const grab = {id: piece.id, x: piece.x, y: piece.y, o: piece.orientation};
		this.peers[this.selfId].piece = grab;
		this.gameChannel.send(JSON.stringify({grab}));
	}
	handleDrop(piece) {
		const drop = {id: piece.id, x: piece.x, y: piece.y, o: piece.orientation};
		delete this.peers[this.selfId].piece;
		this.gameChannel.send(JSON.stringify({drop}));
	}
	sendUpdate() {
		if (this.shouldSend) {
			this.gameChannel.send(JSON.stringify(this.peers[this.selfId]));
			this.shouldSend = false;
		}
	}
	waitForData() {
		return new Promise((resolve) => {
			let doneCount = 0;
			let dataUrl = "";
			let puzzleJson = "";

			async function onDone() {
				const image = await dataUrlToImage(dataUrl);

				const {h, v, p} = JSON.parse(puzzleJson);
				const puzzle = new Puzzle(image, v.length + 1, h.length + 1, h, v);
				resolve([puzzle, p]);
			}

			this.imageChannel.onmessage = (event) => {
				if (event.data === "done") {
					if (++doneCount === 2) {
						onDone();
					}
				} else {
					dataUrl += event.data;
				}
			};
			this.puzzleChannel.onmessage = (event) => {
				if (event.data === "done") {
					if (++doneCount === 2) {
						onDone();
					}
				} else {
					puzzleJson += event.data;
				}
			};
		});
	}
}
