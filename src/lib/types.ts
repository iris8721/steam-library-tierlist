export interface Game {
	id: string;
	appid: number | string;
	name: string;
	playtime: number;
	isCustom: boolean;
	imageData: string;
}

export interface Tier {
	id: string;
	name: string;
	color: string;
	gameIds: string[];
}

export type StatusType = 'normal' | 'error' | 'success';

export interface StatusMessage {
	message: string;
	type: StatusType;
}
