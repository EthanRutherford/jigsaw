import React, {useState} from "react";
import {isHex} from "./color-convert";
import {rgbColor, hslColor, rgbGradient, hslGradient} from "./css-colors";
import {useMappingUpdate, useSlider} from "./hooks";
import styles from "../../styles/color-pickers.css";

export function HexInput({color, set, className, ...props}) {
	const [text, setText] = useState();
	const onChange = (event) => {
		const string = event.target.value;
		setText(string);

		if (isHex(string)) {
			set.hex(string);
		}
	};

	return (
		<input
			{...props}
			type="text"
			className={`${styles.hexInput} ${className || ""}`}
			value={text == null ? color.hex : text}
			maxLength={9}
			onChange={onChange}
			onBlur={() => setText()}
		/>
	);
}

function channelSliderFactory(channel, scale, mode) {
	const getGradient = mode === "hsl" ? hslGradient : rgbGradient;
	const colorFunc = mode === "hsl" ? hslColor : rgbColor;
	const getThumbColor = channel === "a" ? colorFunc : (v) => colorFunc({...v, a: 1});

	const Slider = function({color, set, className, ...props}) {
		const sliderProps = useSlider(
			useMappingUpdate(
				color[mode],
				set[mode],
				(v) => ({x: v[channel] / scale, y: 0}),
				(v, p) => ({...v, [channel]: p.x * scale}),
			),
		);

		const v = color[mode][channel];
		const backgroundColor = getThumbColor(color[mode]);
		return (
			<div className={`${styles.sliderContainer} ${className || ""}`} {...props}>
				<div
					className={styles.sliderTrack}
					style={{background: getGradient(color[mode], channel)}}
					tabIndex={0}
					{...sliderProps}
				>
					<div
						className={styles.sliderThumb}
						style={{left: `${(v / scale) * 100}%`, backgroundColor}}
					/>
				</div>
			</div>
		);
	};

	Slider.displayName = channel + "Slider";
	return Slider;
}

export const RedSlider = channelSliderFactory("r", 255, "rgb");
export const GreenSlider = channelSliderFactory("g", 255, "rgb");
export const BlueSlider = channelSliderFactory("b", 255, "rgb");

export const HueSlider = channelSliderFactory("h", 360, "hsl");
export const HslSaturationSlider = channelSliderFactory("s", 1, "hsl");
export const HslLightnessSlider = channelSliderFactory("l", 1, "hsl");

export const AlphaSlider = channelSliderFactory("a", 1, "rgb");

export function SvPicker({color, set, className, ...props}) {
	const svSliderProps = useSlider(
		useMappingUpdate(
			color.hsv,
			set.hsv,
			(v) => ({x: v.s, y: 1 - v.v}),
			(v, p) => ({...v, s: p.x, v: 1 - p.y}),
		),
	);

	const {h, s, v} = color.hsv;
	const backgroundColor = rgbColor({...color.rgb, a: 1});
	return (
		<div
			className={`${styles.svBoxSlider} ${className || ""}`}
			style={{backgroundColor: `hsl(${h}, 100%, 50%)`}}
			tabIndex={0}
			{...props}
			{...svSliderProps}
		>
			<div
				className={styles.svThumb}
				style={{left: `${s * 100}%`, top: `${(1 - v) * 100}%`, backgroundColor}}
			/>
		</div>
	);
}
