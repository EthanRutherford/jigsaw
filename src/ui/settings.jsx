import React, {useState, useMemo} from "react";
import {saveSettings, loadSettings} from "../logic/settings";
import {useColor} from "./color-picker/hooks";
import {
	HexInput,
	RedSlider, GreenSlider, BlueSlider,
	HueSlider, HslSaturationSlider, HslLightnessSlider,
	SvPicker,
} from "./color-picker/color-pickers";
import {Spinput} from "./spinput";
import styles from "../styles/settings.css";
import {rgbColor} from "./color-picker/css-colors";

function FullColorPicker({color, set}) {
	const [pickerMode, setPickerMode] = useState("hsv");

	return (
		<>
			<div className={styles.colorHeader}>
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
				<div
					className={styles.colorSwatch}
					style={{backgroundColor: rgbColor(color.rgb)}}
				/>
			</div>
			{pickerMode === "hex" ? (
				<HexInput color={color} set={set} />
			) : pickerMode === "rgb" ? (
				<>
					<RedSlider className={styles.slider} color={color} set={set} />
					<GreenSlider className={styles.slider} color={color} set={set} />
					<BlueSlider className={styles.slider} color={color} set={set} />
				</>
			) : pickerMode === "hsl" ? (
				<>
					<HueSlider className={styles.slider} color={color} set={set} />
					<HslSaturationSlider className={styles.slider} color={color} set={set} />
					<HslLightnessSlider className={styles.slider} color={color} set={set} />
				</>
			) : pickerMode === "hsv" ? (
				<>
					<SvPicker className={styles.svPicker} color={color} set={set} />
					<HueSlider className={styles.slider} color={color} set={set} />
				</>
			) : (
				<div>this shouldn't happen :(</div>
			)}
		</>
	);
}

export function SettingsPopup({close}) {
	const initialSettings = useMemo(loadSettings, []);
	const [tab, setTab] = useState(0);
	const [bgColor, setBg] = useColor(initialSettings.bgColor);
	const [zoomScale, setZoomScale] = useState(initialSettings.zoomScale);
	const [panScale, setPanScale] = useState(initialSettings.panScale);
	const [mpColor, setMp] = useColor(initialSettings.mpColor);
	const [name, setName] = useState(initialSettings.name);

	const overlayClick = (event) => {
		if (event.target === event.currentTarget) {
			close();
		}
	};

	const saveAll = (changeSet) => saveSettings({
		bgColor: bgColor.rgb,
		zoomScale,
		panScale,
		mpColor: mpColor.rgb,
		name,
		...changeSet,
	});
	const setBgColor = setBg.useWrapper((color) => saveAll({bgColor: color.rgb}));
	const onZoomChange = (event) => {
		setZoomScale(event.target.value);
		const number = Number.parseFloat(event.target.value);
		if (!Number.isNaN(number)) {
			saveAll({zoomScale: number});
		}
	};
	const onZoomBlur = (event) => {
		const number = Number.parseFloat(event.target.value);
		if (Number.isNaN(number)) {
			setZoomScale(1);
			saveAll({zoomScale: 1});
		}
	};
	const onPanChange = (event) => {
		setPanScale(event.target.value);
		const number = Number.parseFloat(event.target.value);
		if (!Number.isNaN(number)) {
			saveAll({panScale: number});
		}
	};
	const onPanBlur = (event) => {
		const number = Number.parseFloat(event.target.value);
		if (Number.isNaN(number)) {
			setPanScale(1);
			saveAll({panScale: 1});
		}
	};
	const setMpColor = setMp.useWrapper((color) => saveAll({mpColor: color.rgb}));
	const onNameChange = (event) => {
		const value = event.target.value.replace(/\W+/g, "").slice(0, 10);
		setName(value);
		saveAll({name: value});
	};

	return (
		<div className={styles.overlay} onMouseDown={overlayClick}>
			<div className={styles.popup}>
				<div className={styles.tabs}>
					<button
						className={`${styles.tab} ${tab === 0 ? styles.selected : ""}`}
						onClick={() => setTab(0)}
					>
						Settings
					</button>
					<button
						className={`${styles.tab} ${tab === 1 ? styles.selected : ""}`}
						onClick={() => setTab(1)}
					>
						Multiplayer
					</button>
				</div>
				{tab === 0 ? (
					<div className={styles.content}>
						<h2 className={styles.subHeader}>Background color</h2>
						<FullColorPicker color={bgColor} set={setBgColor} />
						<h2 className={styles.subHeader}>Zoom/Pan speed</h2>
						<div className={styles.description}>
							Adjust zoom and pan speed when using mousewheel or trackpad
						</div>
						<label htmlFor="zoom" className={styles.label}>
							Zoom speed
							<Spinput
								id="zoom"
								value={zoomScale}
								step={.1}
								onChange={onZoomChange}
								onBlur={onZoomBlur}
							/>
						</label>
						<label htmlFor="pan" className={styles.label}>
							Pan speed
							<Spinput
								id="pan"
								value={panScale}
								step={.1}
								onChange={onPanChange}
								onBlur={onPanBlur}
							/>
						</label>
						<button className={styles.done} onClick={close}>Done</button>
					</div>
				) : (
					<div className={styles.content}>
						<h2 className={styles.subHeader}>Cursor color</h2>
						<div className={styles.description}>
							The color of your cursor on other player's screens
						</div>
						<FullColorPicker color={mpColor} set={setMpColor} />
						<h2 className={styles.subHeader}>Nickname</h2>
						<input className={styles.input} value={name} onChange={onNameChange} />
						<button className={styles.done} onClick={close}>Done</button>
					</div>
				)}
			</div>
		</div>
	);
}
