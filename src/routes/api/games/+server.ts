import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SteamGame {
	appid: number;
	name: string;
	playtime_forever?: number;
}

interface ResolveVanityApiResponse {
	response?: {
		success?: number;
		steamid?: string;
	};
}

interface OwnedGamesApiResponse {
	response?: {
		games?: SteamGame[];
	};
}

interface GameDto {
	appid: number;
	name: string;
	playtime: number;
}

interface ApiErrorBody {
	success: false;
	message: string;
}

const noStoreHeaders = {
	'cache-control': 'no-store',
};

function isValidSteamId(value: string): boolean {
	return /^\d{17}$/.test(value);
}

function toApiError(message: string): ApiErrorBody {
	return { success: false, message };
}

function jsonNoStore(body: unknown, status = 200) {
	return json(body, { status, headers: noStoreHeaders });
}

async function fetchJson<T>(url: string): Promise<T> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);

	try {
		const response = await fetch(url, { signal: controller.signal });
		if (!response.ok) {
			throw new Error(`Steam API request failed with status ${response.status}`);
		}

		return (await response.json()) as T;
	} catch (error) {
		if (error instanceof Error && error.name === 'AbortError') {
			throw new Error('Steam API request timed out');
		}
		throw error;
	} finally {
		clearTimeout(timeout);
	}
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const steamApiKey = env.STEAM_API_KEY?.trim() ?? '';
		if (!steamApiKey) {
			return jsonNoStore(toApiError('Steam API key is not configured on the server'), 500);
		}

		let steamId = url.searchParams.get('steamid')?.trim() ?? '';
		const vanityUrl = url.searchParams.get('vanity')?.trim() ?? '';

		if (vanityUrl && !steamId) {
			const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${encodeURIComponent(vanityUrl)}`;
			const response = await fetchJson<ResolveVanityApiResponse>(resolveUrl);

			if (response.response?.success === 1 && response.response.steamid) {
				steamId = response.response.steamid;
			} else {
				return jsonNoStore(toApiError(`Could not resolve vanity URL "${vanityUrl}" to a Steam ID. Make sure the vanity URL is correct.`), 400);
			}
		}

		if (!steamId) {
			return jsonNoStore(toApiError('Steam ID or vanity URL is required'), 400);
		}
		if (!isValidSteamId(steamId)) {
			return jsonNoStore(toApiError('Steam ID must be a 17-digit number'), 400);
		}

		const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&format=json`;
		const response = await fetchJson<OwnedGamesApiResponse>(gamesUrl);

		if (!response.response) {
			return jsonNoStore(toApiError('Invalid response from Steam API'), 500);
		}

		if (!response.response.games || response.response.games.length === 0) {
			return jsonNoStore(toApiError('No games found. Make sure your Steam profile is public.'), 404);
		}

		const games: GameDto[] = response.response.games.map((game) => ({
			appid: game.appid,
			name: game.name || `App ${game.appid}`,
			playtime: Math.round((game.playtime_forever || 0) / 60),
		}));

		games.sort((a, b) => a.name.localeCompare(b.name));
		return jsonNoStore(games);
	} catch (error) {
		console.error('Steam API request failed:', error);
		return jsonNoStore(toApiError('Error fetching games from Steam API'), 500);
	}
};
