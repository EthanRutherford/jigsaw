import React, {useRef} from "react";
import styles from "../styles/spinput.css";

export function Spinput(props) {
	const input = useRef();
	const timeout = useRef(null);
	const interval = useRef(null);
	const decrease = () => {
		input.current.stepDown();
		input.current.dispatchEvent(new Event("change", {bubbles: true}));
	};
	const increase = () => {
		input.current.stepUp();
		input.current.dispatchEvent(new Event("change", {bubbles: true}));
	};
	const spinDown = () => {
		decrease();
		timeout.current = setTimeout(() => {
			interval.current = setInterval(decrease, 50);
		}, 200);
	};
	const spinUp = () => {
		increase();
		timeout.current = setTimeout(() => {
			interval.current = setInterval(increase, 50);
		}, 200);
	};
	const unRepeat = () => {
		clearTimeout(timeout.current);
		clearInterval(interval.current);
	};

	return (
		<div className={styles.spinput}>
			<button onMouseDown={spinDown} onMouseUp={unRepeat} onMouseOut={unRepeat} />
			<input type="number" {...props} ref={input} />
			<button onMouseDown={spinUp} onMouseUp={unRepeat} onMouseOut={unRepeat} />
		</div>
	);
}
