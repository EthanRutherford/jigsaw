import {useEffect} from "react";

export function useAsyncEffect(asyncCallback, deps) {
	useEffect(() => {
		const cancelled = {value: false};
		const promise = asyncCallback(() => cancelled.value);

		return () => {
			cancelled.value = true;
			promise.then((cleanup) => {
				if (cleanup instanceof Function) {
					cleanup();
				}
			});
		};
	}, deps);
}
