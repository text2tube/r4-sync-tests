export function uuid() {
	return self.crypto.randomUUID()
}

export async function delay(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}
