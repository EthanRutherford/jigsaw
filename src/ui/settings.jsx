import React, {useState, useMemo} from "react";
import {saveSettings, loadSettings} from "../logic/settings";
import {useColor} from "./color-picker/hooks";
import {
	HexInput,
	RedSlider, GreenSlider, BlueSlider,
	HueSlider, HslSaturationSlider, HslLightnessSlider,
	SvPicker,
} from "./color-picker/color-pickers";
import styles from "../styles/settings.css";

export function SettingsPopup({close}) {
	const initialSettings = useMemo(loadSettings, []);
	const [pickerMode, setPickerMode] = useState("hsv");
	const [bgColor, setColor] = useColor(initialSettings.bgColor);
	const [zoomScale, setZoomScale] = useState(initialSettings.zoomScale);
	const [panScale, setPanScale] = useState(initialSettings.panScale);

	const overlayClick = (event) => {
		if (event.target === event.currentTarget) {
			close();
		}
	};
	const setBgColor = setColor.useWrapper((color) => {
		saveSettings({bgColor: color.rgb, panScale});
	});
	const onZoomChange = (event) => {
		setZoomScale(event.target.value);
		const number = Number.parseFloat(event.target.value);
		if (!Number.isNaN(number)) {
			saveSettings({bgColor: bgColor.rgb, zoomScale: number, panScale});
		}
	};
	const onZoomBlur = (event) => {
		const number = Number.parseFloat(event.target.value);
		if (Number.isNaN(number)) {
			setZoomScale(1);
			saveSettings({bgColor: bgColor.rgb, zoomScale: 1, panScale});
		}
	};
	const onPanChange = (event) => {
		setPanScale(event.target.value);
		const number = Number.parseFloat(event.target.value);
		if (!Number.isNaN(number)) {
			saveSettings({bgColor: bgColor.rgb, zoomScale, panScale: number});
		}
	};
	const onPanBlur = (event) => {
		const number = Number.parseFloat(event.target.value);
		if (Number.isNaN(number)) {
			setPanScale(1);
			saveSettings({bgColor: bgColor.rgb, zoomScale, panScale: 1});
		}
	};

	return (
		<div className={styles.overlay} onMouseDown={overlayClick}>
			<div className={styles.popup}>
				<h1 className={styles.header}>Settings</h1>
				<h2 className={styles.subHeader}>Background color</h2>
				<select
					className={styles.modePicker}
					value={pickerMode}
					onChange={(event) => setPickerMode(event.target.value)}
				>
					<option value="hex">Hex</option>
					<option value="rgb">RGB</option>
					<option value="hsl">HSL</option>
					<option value="hsv">HSV</option>
				</select>
				{pickerMode === "hex" ? (
					<HexInput color={bgColor} set={setBgColor} />
				) : pickerMode === "rgb" ? (
					<>
						<RedSlider className={styles.slider} color={bgColor} set={setBgColor} />
						<GreenSlider className={styles.slider} color={bgColor} set={setBgColor} />
						<BlueSlider className={styles.slider} color={bgColor} set={setBgColor} />
					</>
				) : pickerMode === "hsl" ? (
					<>
						<HueSlider className={styles.slider} color={bgColor} set={setBgColor} />
						<HslSaturationSlider className={styles.slider} color={bgColor} set={setBgColor} />
						<HslLightnessSlider className={styles.slider} color={bgColor} set={setBgColor} />
					</>
				) : pickerMode === "hsv" ? (
					<>
						<SvPicker className={styles.svPicker} color={bgColor} set={setBgColor} />
						<HueSlider className={styles.slider} color={bgColor} set={setBgColor} />
					</>
				) : (
					<div>this shouldn't happen :(</div>
				)}
				<h2 className={styles.subHeader}>Zoom/Pan speed</h2>
				<div className={styles.description}>
					Adjust zoom and pan speed when using mousewheel or trackpad
				</div>
				<label className={styles.label}>
					Zoom speed
					<input
						type="number"
						className={styles.scaleInput}
						step={.1}
						value={zoomScale}
						onChange={onZoomChange}
						onBlur={onZoomBlur}
					/>
				</label>
				<label className={styles.label}>
					Pan speed
					<input
						type="number"
						className={styles.scaleInput}
						step={.1}
						value={panScale}
						onChange={onPanChange}
						onBlur={onPanBlur}
					/>
				</label>
				<button className={styles.done} onClick={close}>Done</button>
			</div>
		</div>
	);
}
