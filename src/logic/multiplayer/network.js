import {loadSettings, addSettingsListener, removeSettingsListener} from "../settings";
import {dataUrlToImage, imageToDataUrl} from "../jigsaw-db";
import {Puzzle} from "../puzzle/puzzle";

// one day, webrtc will actually work in chrome again.
// until then, we just dump our messages through my tiny websocket server
// like a chump
const wsBaseUrl = "wss://signal.rutherford.site";

function updatePiece(game, update) {
	const piece = game.pieces[update.id];
	piece.x = update.x;
	piece.y = update.y;
	piece.orientation = update.o;
	return piece;
}

function roundColor(color) {
	return {
		r: Math.round(color.r),
		g: Math.round(color.g),
		b: Math.round(color.b),
	};
}

class PeerSocket {
	constructor(baseUrl, roomId, isHost) {
		this.closed = false;
		this.selfId = null;

		this.onnewpeer = null;
		this.onlostpeer = null;
		this.onconnectionlost = null;
		this.onidchange = null;
		this.onmessage = null;

		let socketAttempts = 0;
		this.pendingMessage = null;
		const setupSocket = () => {
			this.socket = new WebSocket(`${baseUrl}/${roomId}/${isHost ? "host" : "client"}`);
			this.socket.onopen = () => socketAttempts = 0;
			this.socket.onmessage = (event) => {
				const {selfId, newPeerId, lostPeerId, peerId, data} = JSON.parse(event.data);
				if (selfId != null && selfId !== this.selfId) {
					this.selfId = selfId;
					if (this.onidchange != null) {
						this.onidchange(this.selfId);
					}
				}

				if (newPeerId != null && this.onnewpeer != null) {
					this.onnewpeer(newPeerId);
				}

				if (lostPeerId != null && this.onlostpeer != null) {
					this.onlostpeer(lostPeerId);
				}

				if (data != null && this.onmessage != null) {
					this.onmessage(peerId, data);
				}
			};
			this.socket.onclose = () => {
				if (socketAttempts++ < 5) {
					// retry if we didn't close the connection on purpose
					if (!this.closed) {
						setupSocket();
					}
				} else if (this.onconnectionlost != null) {
					this.onConnectionlost();
				}
			};
		};

		setupSocket();
	}
	async send(data, peerId) {
		const message = {data};
		if (peerId != null) {
			message.peerId = peerId;
		}

		if (this.socket.readyState === 1) {
			this.socket.send(JSON.stringify(message));
		}
	}
	close() {
		this.closed = true;
		this.socket.close();
	}
}

class Node {
	constructor(roomKey, isHost) {
		const name = `jigsaw-${roomKey}`;
		this.shouldSend = true;
		this.peerSocket = new PeerSocket(wsBaseUrl, name, isHost);
		this.selfId = -1;
		this.peers = {[this.selfId]: {x: 0, y: 0, c: roundColor(loadSettings().mpColor)}};
		this.peerSocket.onidchange = (newId) => {
			this.peers[newId] = this.peers[this.selfId];
			delete this.peers[this.selfId];
			this.selfId = newId;
		};

		this.peerSocket.onmessage = (peerId, message) => this.handleMessage(peerId, message);

		this.onSettingsChange = (settings) => {
			this.shouldSend = true;
			this.peers[this.selfId].c = roundColor(settings.mpColor);
		};
		addSettingsListener(this.onSettingsChange);
	}
	setup(game) {
		this.game = game;
		game.mp = this;
		this.interval = setInterval(() => this.sendUpdate(), 33);
	}
	getCursors() {
		return Object.entries(this.peers).filter(
			([id]) => Number.parseInt(id, 10) !== this.selfId,
		).map(([, peer]) => ({x: peer.x, y: peer.y, color: peer.c}));
	}
	close() {
		clearInterval(this.interval);
		this.peerSocket.close();
		removeSettingsListener(this.onSettingsChange);
	}
}

export class Host extends Node {
	constructor(roomKey) {
		super(roomKey, true);
		this.nextId = 0;

		// temporarily manage peers, until the game actually starts
		this.peerSocket.onnewpeer = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0};
		};
		this.peerSocket.onlostpeer = (peerId) => {
			delete this.peers[peerId];
		};
	}
	setup(game, puzzle) {
		const initMessage = {
			h: puzzle.horizontal,
			v: puzzle.vertical,
			p: game.getPieces(),
			d: imageToDataUrl(puzzle.image),
		};

		if (Object.keys(this.peers).length > 1) {
			this.peerSocket.send(initMessage);
		}

		this.peerSocket.onnewpeer = (peerId) => {
			this.peers[peerId] = {x: 0, y: 0, c: {r: 255, g: 255, b: 255}};
			this.peerSocket.send(initMessage, peerId);
		};
		this.peerSocket.onlostpeer = (peerId) => {
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

		if (message.c != null) {
			peer.c = message.c;
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

		this.peerSocket.send({pieces, peers: this.peers});
	}
}

export class Client extends Node {
	constructor(roomKey) {
		super(roomKey, false);
		this.ignorePieceId = -1;
		this.ignoreTimeout = null;
	}
	handleMessage(_, message) {
		if (message.h != null) {
			this.initData = message;
			if (this.initResolve != null) {
				this.initResolve(this.initData);
			}

			return;
		}

		if (this.game == null) {
			return;
		}

		for (const piece of message.pieces) {
			if (piece.id !== this.ignorePieceId) {
				updatePiece(this.game, piece);
			}
		}

		const peersToDelete = new Set(Object.keys(this.peers).map((i) => Number.parseInt(i, 10)));
		peersToDelete.delete(this.selfId);
		for (const [x, peer] of Object.entries(message.peers)) {
			const peerId = Number.parseInt(x, 10);
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
		this.peerSocket.send({grab});

		this.ignorePieceId = piece.id;
		clearTimeout(this.ignoreTimeout);
	}
	handleDrop(piece) {
		const drop = {id: piece.id, x: piece.x, y: piece.y, o: piece.orientation};
		delete this.peers[this.selfId].piece;
		this.peerSocket.send({drop});

		this.ignoreTimeout = setTimeout(() => this.ignorePieceId = null, 200);
	}
	sendUpdate() {
		if (this.shouldSend) {
			this.peerSocket.send(this.peers[this.selfId]);
			this.shouldSend = false;
		}
	}
	waitForData() {
		return new Promise((resolve) => {
			const resolver = async (initData) => {
				const {h, v, p, d} = initData;
				const image = await dataUrlToImage(d);
				const puzzle = new Puzzle(image, v.length + 1, h.length + 1, h, v);
				resolve([puzzle, p]);
			};

			if (this.initData) {
				resolver(this.initData);
			} else {
				this.initResolve = resolver;
			}
		});
	}
}
