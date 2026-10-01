import { getBackblazeBucket } from "./backblaze-bucket";

export const env = new Proxy(process.env, {
	get(target, property, receiver) {
		if (property === "BUCKET") return getBackblazeBucket();
		return Reflect.get(target, property, receiver);
	},
}) as typeof process.env & { BUCKET: R2Bucket };