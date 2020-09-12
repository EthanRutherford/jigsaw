// copy-paste from an as-of-yet unpublished project

function icify(url) {
	return {url, urls: [url]};
}

function connect(send, listen) {
	const peerConnection = new RTCPeerConnection({iceServers: [
		icify("stun:stun.l.google.com:19302"),
		icify("stun:stun1.l.google.com:19302"),
		icify("stun:stun2.l.google.com:19302"),
		icify("stun:stun3.l.google.com:19302"),
		icify("stun:stun4.l.google.com:19302"),
	]});

	peerConnection.onicecandidate = ({candidate}) => {
		console.log(candidate);
		candidate != null && send({candidate});
	};
	peerConnection.onnegotiationneeded = async () => {
		await peerConnection.setLocalDescription(await peerConnection.createOffer());
		send({desc: peerConnection.localDescription});
	};

	peerConnection.onicecandidateerror = console.log;
	peerConnection.oniceconnectionstatechange = () => console.log(peerConnection.iceConnectionState);
	peerConnection.onsignalingstatechange = () => console.log(peerConnection.signalingState);

	listen(async (message) => {
		if (message.desc != null) {
			if (message.desc.type === "offer") {
				await peerConnection.setRemoteDescription(message.desc);
				await peerConnection.setLocalDescription(await peerConnection.createAnswer());
				send({desc: peerConnection.localDescription});
			} else if (message.desc.type === "answer") {
				await peerConnection.setRemoteDescription(message.desc);
			} else {
				throw new Error(`unsupported message: ${JSON.stringify(message)}`);
			}
		} else if (message.candidate != null) {
			await peerConnection.addIceCandidate(message.candidate);
		} else {
			throw new Error(`unsupported message: ${JSON.stringify(message)}`);
		}
	});

	return peerConnection;
}

function sendCore(channelPromise, message) {
	channelPromise.then((channel) => {
		if (channel.readyState === "open") {
			channel.send(message);
		}
	});
}

class Multiplexer {
	constructor(name, peers) {
		this.name = name;
		this.peers = peers;
		this.onmessage = null;

		for (const peer of Object.values(peers)) {
			this.setupPeer(peer);
		}
	}
	setupPeer(peer) {
		let resolver = null;
		peer.channels[this.name] = new Promise((resolve) => resolver = resolve);
		const resolve = (channel) => {
			channel.onopen = () => resolver(channel);
			channel.onmessage = (event) => {
				event.peerId = peer.peerId;
				if (this.onmessage != null) {
					this.onmessage(event);
				}
			};
			channel.onerror = console.error;
			channel.onclose = () => delete peer.channels[name];
		};

		if (peer.shouldLead) {
			resolve(peer.connection.createDataChannel(this.name));
		} else {
			peer.channels[this.name].resolve = resolve;
		}
	}
	cleanupPeer(peer) {
		if (peer.channels[this.name] != null) {
			peer.channels[this.name].then((channel) => channel.close());
			delete peer.channels[this.name];
		}
	}
	send(message, peerId = null) {
		if (peerId != null) {
			const peer = this.peers[peerId];
			if (peer != null) {
				sendCore(peer.channels[this.name], message);
			}
		}

		for (const peer of Object.values(this.peers)) {
			sendCore(peer.channels[this.name], message);
		}
	}
}

export class PeerManager {
	constructor(baseUrl, roomId, isHost = false) {
		this.peers = {};
		this.channels = {};
		this.closed = false;
		this.selfId = null;

		this.onpeerconnected = null;
		this.onpeerlost = null;
		this.onconnectionlost = null;
		this.onidchange = null;

		let socketAttempts = 0;
		const setupSocket = () => {
			const socket = new WebSocket(`${baseUrl}/${roomId}/${isHost ? "host" : "client"}`);
			socket.onopen = () => socketAttempts = 0;
			socket.onmessage = (event) => {
				const {selfId, peerId, data} = JSON.parse(event.data);
				if (selfId !== this.selfId) {
					this.selfId = selfId;
					if (this.onidchange != null) {
						this.onidchange(this.selfId);
					}
				}

				if (this.peers[peerId] == null) {
					const peer = {peerId, channels: {}, shouldLead: data == null};
					this.peers[peerId] = peer;
					peer.connection = connect(
						(data) => socket.send(JSON.stringify({peerId: peerId, data})),
						(listener) => peer.handleSignal = listener,
					);

					for (const channel of Object.values(this.channels)) {
						channel.setupPeer(peer);
					}

					if (!peer.shouldLead) {
						peer.connection.ondatachannel = ({channel}) => {
							if (peer.channels[channel.label] != null) {
								peer.channels[channel.label].resolve(channel);
							}
						};
					}

					if (this.onpeerconnected) {
						this.onpeerconnected(peerId);
					}

					// connection lost logic
					let timeout = null;
					peer.connection.onconnectionstatechange = () => {
						const state = peer.connection.connectionState;
						console.log(state);
						if (state === "failed") {
							// peer.connection.restartIce();
							timeout = setTimeout(() => {
								delete this.peers[peerId];
								for (const channel of Object.values(this.channels)) {
									channel.cleanupPeer(peer);
								}

								if (this.onpeerlost != null) {
									this.onpeerlost(peerId);
								}
							}, 5000);
						} else if (state === "connected") {
							clearTimeout(timeout);
						}
					};
				}

				if (data != null) {
					this.peers[peerId].handleSignal(data);
				}
			};
			socket.onclose = () => {
				for (const [peerId, peer] of Object.entries(this.peers)) {
					for (const channel of Object.values(this.channels)) {
						channel.cleanupPeer(peer);
					}

					peer.connection.close();
					delete this.peers[peerId];
				}

				if (socketAttempts++ < 5) {
					// retry if we didn't close the connection on purpose
					if (!this.closed) {
						setupSocket();
					}
				} else if (this.onconnectionlost != null) {
					this.onConnectionlost();
				}
			};

			this.closeSocket = () => socket.close();
		};

		setupSocket();
	}
	createDataChannel(name) {
		if (this.channels[name] == null) {
			this.channels[name] = new Multiplexer(name, this.peers);
		}

		return this.channels[name];
	}
	closeDataChannel(name) {
		if (this.channels[name] == null) {
			return;
		}

		this.channels[name].name = null;
		this.channels[name].peers = null;
		this.channels[name].onmessage = null;
		for (const peer of Object.values(this.peers)) {
			peer.channels[name].then((channel) => channel.close());
			delete peer.channels[name];
		}

		delete this.channels[name];
	}
	close() {
		this.closed = true;
		this.closeSocket();
	}
}
