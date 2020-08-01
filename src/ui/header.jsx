import React from "react";
import styles from "../styles/header.css";

export function Header({goHome}) {
	return (
		<div className={styles.wrapper}>
			<div className={styles.header}>
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
			</div>
		</div>
	);
}
