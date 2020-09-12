import {dataUrlToImage, imageToDataUrl} from "../jigsaw-db";
import {Puzzle} from "../puzzle/puzzle";
import {PeerManager} from "./peer";

const wsBaseUrl = "wss://signal.rutherford.site";

function segmentMessage(message) {
	const segmentSize = 64000;
	const segments = [];
	while (message.length > 0) {
		const segment = message.slice(0, segmentSize);
		message = message.slice(segmentSize);
		segments.push(segment);
	}

	segments.push("done");
	return segments;
}
function sendSegments(channel, segments, index = 0) {
	channel.send(segments[index]);
	index++;

	if (index < segments.length) {
		setTimeout(() => sendSegments(channel, segments, index), 10);
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
		this.selfId = -1;
		this.peers = {[this.selfId]: {x: 0, y: 0}};
		this.peerManager.onidchange = (newId) => {
			this.peers[newId] = this.peers[this.selfId];
			delete this.peers[this.selfId];
			this.selfId = newId;
		};

		this.initChannel = this.peerManager.createDataChannel("init");
		this.gameChannel = this.peerManager.createDataChannel("game");

		this.gameChannel.onmessage = (event) => this.handleMessage(
			event.peerId, JSON.parse(event.data),
		);
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
		this.nextId = 0;

		// temporarily manage peers, until the game actually starts
		this.peerManager.onpeerconnected = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0};
		};
		this.peerManager.onpeerlost = (peerId) => {
			delete this.peers[peerId];
		};
	}
	setup(game, puzzle) {
		const dataUrl = imageToDataUrl(puzzle.image);
		const initSegments = segmentMessage(JSON.stringify({
			h: puzzle.horizontal,
			v: puzzle.vertical,
			p: game.getPieces(),
			d: dataUrl,
		}));

		if (Object.keys(this.peers).length !== 0) {
			sendSegments(this.initChannel, initSegments);
		}

		this.peerManager.onpeerconnected = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0};
			sendSegments(this.initChannel, initSegments);
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
		// to keep message sizes small and quick, we only send 20 puzzle pieces at a time.
		// we always send any pieces currently being dragged by a player, and then round
		// robin remaining pieces to fill the buffer. This ensures that message sizes
		// stay relatively small, while still ensuring every piece is synced periodically.
		const pieceIds = new Set();
		for (const peer of Object.values(this.peers)) {
			if (peer.piece != null) {
				pieceIds.add(peer.piece.id);
			}
		}

		while (pieceIds.size < 20) {
			pieceIds.add(this.nextId++);
			if (this.nextId === this.game.pieces.length) {
				this.nextId = 0;
			}
		}

		const pieces = [...pieceIds].map((id) => {
			const p = this.game.pieces[id];
			return {id, x: p.x, y: p.y, o: p.orientation, g: p.group.id};
		});

		const message = JSON.stringify({pieces, peers: this.peers});
		this.gameChannel.send(message);
	}
}

export class Client extends Node {
	constructor(roomKey) {
		super(roomKey, false);
		this.shouldSend = false;
	}
	handleMessage(_, message) {
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
			let initJson = "";
			this.initChannel.onmessage = async (event) => {
				console.log("getting data");
				if (event.data === "done") {
					this.initChannel.onmessage = null;
					const {h, v, p, d} = JSON.parse(initJson);
					const image = await dataUrlToImage(d);
					const puzzle = new Puzzle(image, v.length + 1, h.length + 1, h, v);
					resolve([puzzle, p]);
				} else {
					initJson += event.data;
				}
			};
		});
	}
}
