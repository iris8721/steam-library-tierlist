import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface SteamGame {
	appid: number;
	name: string;
	playtime_forever: number;
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

function toApiError(message: string): ApiErrorBody {
	return { success: false, message };
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Steam API request failed with status ${response.status}`);
	}

	return (await response.json()) as T;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const steamApiKey = env.STEAM_API_KEY?.trim() ?? '';
		if (!steamApiKey) {
			return json(toApiError('Steam API key is not configured on the server'), { status: 500 });
		}

		let steamId = url.searchParams.get('steamid')?.trim() ?? '';
		const vanityUrl = url.searchParams.get('vanity')?.trim() ?? '';

		if (vanityUrl && !steamId) {
			const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${steamApiKey}&vanityurl=${encodeURIComponent(vanityUrl)}`;
			const response = await fetchJson<ResolveVanityApiResponse>(resolveUrl);

			if (response.response?.success === 1 && response.response.steamid) {
				steamId = response.response.steamid;
			} else {
				return json(toApiError(`Could not resolve vanity URL "${vanityUrl}" to a Steam ID. Make sure the vanity URL is correct.`), {
					status: 400,
				});
			}
		}

		if (!steamId) {
			return json(toApiError('Steam ID or vanity URL is required'), { status: 400 });
		}

		const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&format=json`;
		const response = await fetchJson<OwnedGamesApiResponse>(gamesUrl);

		if (!response.response) {
			return json(toApiError('Invalid response from Steam API'), { status: 500 });
		}

		if (!response.response.games || response.response.games.length === 0) {
			return json(toApiError('No games found. Make sure your Steam profile is public.'), { status: 404 });
		}

		const games: GameDto[] = response.response.games.map((game) => ({
			appid: game.appid,
			name: game.name,
			playtime: Math.round(game.playtime_forever / 60),
		}));

		games.sort((a, b) => a.name.localeCompare(b.name));
		return json(games);
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		return json(toApiError(`Error fetching games from Steam API: ${message}`), { status: 500 });
	}
};
