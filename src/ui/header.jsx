import React, {useState} from "react";
import SettingsIcon from "../../images/svgs/settings.svg";
import {SettingsPopup} from "./settings";
import styles from "../styles/header.css";
import {rgbColor} from "./color-picker/css-colors";

function Peer({name, color}) {
	return (
		<div className={styles.player}>
			<div
				className={styles.playerColor}
				style={{backgroundColor: rgbColor({...color, a: 1})}}
			/>
			{name}
		</div>
	);
}

export function Header({goHome, roomId, peers}) {
	const [showSettings, setShowSettings] = useState(false);

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				<div className={styles.title}>
					<a
						className={styles.homeLink}
						href="/"
						onClick={(event) => {
							event.preventDefault();
							goHome();
						}}
					>
						Jigsaw
					</a>
					{roomId != null && (
						<div className={styles.room}>
							{roomId}
							<div className={styles.players}>
								{peers == null || peers.length === 0 ? "No connected players" : peers.map(
									(peer) => <Peer {...peer} key={peer.id} />,
								)}
							</div>
						</div>
					)}
				</div>
				<button className={styles.settingsButton} onClick={() => setShowSettings(true)}>
					<SettingsIcon className={styles.settingsIcon} />
				</button>
				{showSettings && (
					<SettingsPopup close={() => setShowSettings(false)} />
				)}
			</div>
		</div>
	);
}
