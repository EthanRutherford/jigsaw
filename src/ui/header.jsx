import React, {useState} from "react";
import SettingsIcon from "../../images/svgs/settings.svg";
import {SettingsPopup} from "./settings";
import styles from "../styles/header.css";

export function Header({goHome, roomId}) {
	const [showSettings, setShowSettings] = useState(false);

	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
				<div>
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
					{roomId ? ` - ${roomId}` : ""}
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
