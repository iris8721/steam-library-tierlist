<script lang="ts">
	import type { Game } from '../types';

	export let game: Game;
	export let dragging = false;
	export let steamIconSvg = '';
	export let fallbackImage = '';
	export let onDragStart: (event: DragEvent, gameId: string) => void = () => {};
	export let onDragEnd: () => void = () => {};

	const customPlaceholder =
		'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22120%22%20height%3D%2256%22%3E%3Crect%20width%3D%22120%22%20height%3D%2256%22%20fill%3D%22%23424242%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2228%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23ffffff%22%3ECustom%20Game%3C%2Ftext%3E%3C%2Fsvg%3E';

	let imageSrc = '';
	$: imageSrc = game.isCustom ? game.imageData || customPlaceholder : `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

	function formatPlaytime(hours: number) {
		const value = Number(hours) || 0;
		if (value === 0) return '0 hrs';
		if (value < 1) return '< 1 hr';
		return `${value} hrs`;
	}

	function openStore() {
		if (game.isCustom) return;
		window.open(`https://store.steampowered.com/app/${game.appid}`, '_blank');
	}

	function handleImageError(event: Event) {
		const image = event.currentTarget as HTMLImageElement | null;
		if (!image) return;
		if (image.src !== fallbackImage) {
			image.src = fallbackImage;
		}
	}
</script>

<div
	class={`game-card ${dragging ? 'dragging' : ''}`}
	draggable="true"
	data-game-id={game.id}
	role="listitem"
	aria-label={game.name}
	on:dragstart={(event) => onDragStart(event, game.id)}
	on:dragend={onDragEnd}
>
	<div class="game-tooltip">{game.name}</div>

	{#if !game.isCustom}
		<button type="button" class="steam-store-link" title="Open in Steam Store" on:click|stopPropagation={openStore}>
			{@html steamIconSvg}
		</button>
	{/if}

	<img class="game-image" src={imageSrc} alt={game.name} crossorigin="anonymous" on:error={handleImageError} />
	<div class="game-name" title={game.name}>{game.name}</div>
	<div class="game-playtime">{formatPlaytime(game.playtime)}</div>
</div>

<style>
	.game-card {
		width: 132px;
		height: 132px;
		background: var(--container-bg);
		border: 1px solid var(--line-color);
		overflow: hidden;
		cursor: grab;
		position: relative;
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
		transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
		animation: card-in 280ms ease-out both;
	}

	.game-card:hover {
		transform: translateY(-2px);
		border-color: var(--accent-color);
		box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
	}

	.game-card.dragging {
		opacity: 0.65;
		transform: scale(0.98);
	}

	.game-image {
		width: 100%;
		height: 62px;
		object-fit: cover;
		pointer-events: none;
		border-bottom: 1px solid var(--line-color);
	}

	.game-name {
		padding: 7px 6px 0;
		font-size: 12px;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		pointer-events: none;
	}

	.game-playtime {
		position: absolute;
		left: 6px;
		bottom: 6px;
		font-size: 10px;
		color: var(--playtime-color);
		border: 1px solid var(--playtime-pill-border);
		background: var(--playtime-pill-bg);
		padding: 2px 5px;
		text-transform: lowercase;
		pointer-events: none;
	}

	.game-tooltip {
		display: none;
		position: absolute;
		top: -34px;
		left: 50%;
		transform: translateX(-50%);
		background: var(--container-bg);
		color: var(--text-color);
		padding: 4px 8px;
		border: 1px solid var(--line-strong);
		font-size: 11px;
		z-index: 10;
		white-space: nowrap;
		max-width: 220px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.game-card:hover .game-tooltip {
		display: block;
	}

	.steam-store-link {
		position: absolute;
		top: 6px;
		right: 6px;
		width: 20px;
		height: 20px;
		border: 1px solid var(--line-color);
		background: var(--container-bg);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s ease, border-color 0.2s ease;
		cursor: pointer;
	}

	:global(.steam-store-link svg) {
		width: 14px;
		height: 14px;
		fill: var(--accent-color);
	}

	.game-card:hover .steam-store-link {
		opacity: 1;
	}

	.steam-store-link:hover {
		border-color: var(--accent-color);
	}

	:global(.game-card.clone-for-export) .steam-store-link {
		display: none;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.game-card {
			animation: none;
			transition: none;
		}

		.game-card:hover {
			transform: none;
		}
	}
</style>
