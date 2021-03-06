import React from "react";
import styles from "../styles/warning";

export function Warning({header, content, confirm, cancel, onConfirm, onCancel}) {
	return (
		<div
			className={styles.warningOverlay}
			onClick={onCancel}
		>
			<div className={styles.warningPopup}>
				<h2 className={styles.warningHeader}>{header}</h2>
				<div className={styles.warningContent}>
					{content}
				</div>
				<div className={styles.buttonContainer}>
					<button className={styles.confirm} onClick={onConfirm}>{confirm}</button>
					<button className={styles.cancel} onClick={onCancel}>{cancel}</button>
				</div>
			</div>
		</div>
	);
}
