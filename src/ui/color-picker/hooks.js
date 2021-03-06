import {useState, useCallback, useEffect, useRef, useMemo} from "react";
import {unstable_batchedUpdates as batchedUpdates} from "react-dom";
import {hsvToHsl, rgbToHsl, hexToRgb, hslToHsv, hslToRgb, rgbToHex, isHex} from "./color-convert";

function useStableCallback(callback) {
	const callbackRef = useRef();
	callbackRef.current = callback;
	return useCallback((...args) => callbackRef.current(...args), []);
}

export function useMappingUpdate(v, setV, mapIn = (x) => x, mapOut = (_, x) => x) {
	return useStableCallback((update) => {
		if (update instanceof Function) {
			setV(mapOut(v, update(mapIn(v))));
		} else {
			setV(mapOut(v, update));
		}
	});
}

export const clamp = (v, min, max) => Math.max(min, Math.min(v, max));
function calcPosition(elem, item) {
	const rect = elem.getBoundingClientRect();
	const w = rect.right - rect.left;
	const h = rect.bottom - rect.top;
	const x = item.clientX - rect.left;
	const y = item.clientY - rect.top;
	return {x: clamp(x / w, 0, 1), y: clamp(y / h, 0, 1)};
}

export function useSlider(onChange) {
	const ref = useRef();
	const isClicking = useRef(false);

	const onMouseDown = useCallback((event) => {
		if (event.button === 0) {
			isClicking.current = true;
			onChange(() => calcPosition(ref.current, event));
		}
	}, [onChange]);

	const onTouchStart = useCallback((event) => {
		isClicking.current = true;
		onChange(() => calcPosition(ref.current, event.touches[0]));
	}, [onChange]);

	const onDragStart = useCallback((event) => event.preventDefault(), []);

	const onKeyDown = useCallback((event) => {
		if (event.key === "ArrowUp") {
			event.preventDefault();
			onChange((v) => ({x: v.x, y: Math.max(v.y - 0.01, 0)}));
		} else if (event.key === "ArrowDown") {
			event.preventDefault();
			onChange((v) => ({x: v.x, y: Math.min(v.y + 0.01, 1)}));
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			onChange((v) => ({x: Math.max(v.x - 0.01, 0), y: v.y}));
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			onChange((v) => ({x: Math.min(v.x + 0.01, 1), y: v.y}));
		}
	}, [onChange]);

	useEffect(() => {
		function onMouseMove(event) {
			if (isClicking.current) {
				if (event.buttons === 0) {
					isClicking.current = false;
				} else {
					event.preventDefault();
					onChange(() => calcPosition(ref.current, event));
				}
			}
		}
		function onTouchMove(event) {
			if (isClicking.current) {
				event.preventDefault();
				onChange(() => calcPosition(ref.current, event.touches[0]));
			}
		}
		function onTouchEnd(event) {
			if (event.touches.length === 0) {
				isClicking.current = false;
			}
		}

		document.addEventListener("mousemove", onMouseMove);
		document.addEventListener("touchmove", onTouchMove);
		document.addEventListener("touchend", onTouchEnd);
		return () => {
			document.removeEventListener("mousemove", onMouseMove);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
		};
	}, [onChange]);

	return {ref, onMouseDown, onTouchStart, onDragStart, onKeyDown, tabIndex: 0};
}

function toHsl(color) {
	if (typeof color === "string" && isHex(color)) {
		return rgbToHsl(hexToRgb(color));
	}

	if (color.r != null) {
		return rgbToHsl(color);
	}

	if (color.h != null) {
		if (color.v) {
			return hsvToHsl(color);
		}

		return color;
	}

	return {h: 0, s: 0, l: 0, a: 1};
}
function hslToColor(hsl) {
	const hsv = hslToHsv(hsl);
	const rgb = hslToRgb(hsl);
	const hex = rgbToHex(rgb);
	return {hsl, hsv, rgb, hex};
}
function useColorSetters(setColor) {
	return useMemo(() => {
		// https://overreacted.io/react-as-a-ui-runtime/#batching
		// batching *usually* works by default, but react can't control document event listeners
		// (which the sliders use for mouse tracking). We use this to prevent multiple rerenders
		// https://twitter.com/dan_abramov/status/1091977127514292224
		const batchedSetColor = (color) => batchedUpdates(() => setColor(color));
		const useWrapper = (onChange) => useColorSetters((c) => {
			setColor(c);
			onChange(c);
		});

		const set = (c) => set.hsl(toHsl(c));

		set.useWrapper = useWrapper;
		set.hsl = (c) => batchedSetColor(hslToColor(c));
		set.hsv = (c) => set.hsl(hsvToHsl(c));
		set.rgb = (c) => set.hsl(rgbToHsl(c));
		set.hex = (c) => set.rgb(hexToRgb(c));

		return set;
	}, [setColor]);
}
export function useColor(initialColor) {
	const [color, setColor] = useState(() => hslToColor(toHsl(initialColor)));
	const set = useColorSetters(setColor);

	return [color, set];
}
