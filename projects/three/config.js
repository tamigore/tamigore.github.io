let cachedConfig = null;

const CONFIG_URL = new URL('../config.json', import.meta.url);

export async function loadConfig() {
	if (cachedConfig)
		return cachedConfig;
	const response = await fetch(CONFIG_URL, { cache: 'no-store' });
	if (!response.ok)
		throw new Error(`Failed to load three.js config (${response.status})`);
	const json = await response.json();
	cachedConfig = json;
	return cachedConfig;
}
