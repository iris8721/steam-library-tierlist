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

	function handleMouseMove(event: MouseEvent) {
		const card = event.currentTarget as HTMLDivElement | null;
		if (!card) return;
		const rect = card.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;
		const cx = rect.width / 2;
		const cy = rect.height / 2;
		const dx = (x - cx) / cx;
		const dy = (y - cy) / cy;

		card.style.transform = `perspective(500px) rotateX(${dy * -15}deg) rotateY(${dx * 15}deg) scale(1.1)`;
		card.style.boxShadow = `${dx * 10}px ${dy * 10}px 15px rgba(0, 0, 0, 0.3)`;
		card.style.transition = 'transform 0.05s ease-out, box-shadow 0.05s ease-out';
	}

	function handleMouseLeave(event: MouseEvent) {
		const card = event.currentTarget as HTMLDivElement | null;
		if (!card) return;
		card.style.transition = 'transform 0.2s ease-out, box-shadow 0.2s ease-out';
		card.style.transform = '';
		card.style.boxShadow = '0 6px 10px rgba(0, 0, 0, 0.15)';
	}

	function handleMouseEnter(event: MouseEvent) {
		const card = event.currentTarget as HTMLDivElement | null;
		if (!card) return;
		card.style.transition = 'transform 0.05s ease-out, box-shadow 0.05s ease-out';
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
	on:mousemove={handleMouseMove}
	on:mouseleave={handleMouseLeave}
	on:mouseenter={handleMouseEnter}
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
	<div class="tilt-effect"></div>
</div>

<style>
	.game-card {
		width: 120px;
		height: 120px;
		background: var(--container-bg);
		border-radius: 5px;
		overflow: hidden;
		cursor: grab;
		position: relative;
		box-shadow: 0 6px 10px rgba(0, 0, 0, 0.15);
	}

	.game-card.dragging {
		opacity: 0.7;
	}

	.game-image {
		width: 100%;
		height: 56px;
		object-fit: cover;
		pointer-events: none;
	}

	.game-name {
		padding: 5px;
		font-size: 12px;
		text-align: center;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 15px;
		pointer-events: none;
	}

	.game-playtime {
		position: absolute;
		left: 5px;
		bottom: 5px;
		font-size: 11px;
		color: var(--playtime-color);
		background: rgba(0, 0, 0, 0.5);
		padding: 2px 4px;
		border-radius: 3px;
		pointer-events: none;
	}

	.game-tooltip {
		display: none;
		position: absolute;
		top: -40px;
		left: 50%;
		transform: translateX(-50%);
		background: rgba(0, 0, 0, 0.8);
		color: #fff;
		padding: 5px 10px;
		border-radius: 5px;
		font-size: 12px;
		z-index: 10;
		white-space: nowrap;
	}

	.game-card:hover .game-tooltip {
		display: block;
	}

	.steam-store-link {
		position: absolute;
		top: 5px;
		right: 5px;
		width: 20px;
		height: 20px;
		border: none;
		border-radius: 3px;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		opacity: 0;
		transition: opacity 0.2s;
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

	.tilt-effect {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	:global(.game-card.clone-for-export) .steam-store-link,
	:global(.game-card.clone-for-export) .tilt-effect {
		display: none;
	}
</style>
