<script lang="ts">
import { onDestroy, onMount } from 'svelte';
import html2canvas from 'html2canvas';
import GameCard from '$lib/components/GameCard.svelte';
import type { Game, StatusMessage, Tier } from '$lib/types';

	interface RgbColor {
		r: number;
		g: number;
		b: number;
	}

	interface SteamApiGame {
		appid: number;
		name: string;
		playtime: number;
	}

	const steamIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"/></svg>`;
	const noImagePlaceholder =
		'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20version%3D%221.1%22%20width%3D%22120%22%20height%3D%2256%22%3E%3Crect%20width%3D%22120%22%20height%3D%2256%22%20fill%3D%22%23424242%22%2F%3E%3Ctext%20x%3D%2260%22%20y%3D%2228%22%20font-family%3D%22Arial%22%20font-size%3D%2212%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20fill%3D%22%23ffffff%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';

	const tierColorOptions = [
		'#ff7f7f',
		'#ffbf7f',
		'#ffdf7f',
		'#ffff7f',
		'#bfff7f',
		'#7fff7f',
		'#7fffbf',
		'#7fffff',
		'#7fbfff',
		'#7f7fff',
		'#bf7fff',
		'#ff7fff',
		'#ff7fbf',
		'#ffffff',
		'#cccccc',
		'#999999',
	];

	const tierDefaults: Array<{ name: string; color: string }> = [
		{ name: 'S', color: '#ff7f7f' },
		{ name: 'A', color: '#ffbf7f' },
		{ name: 'B', color: '#ffdf7f' },
		{ name: 'C', color: '#bfff7f' },
		{ name: 'D', color: '#7fff7f' },
		{ name: 'E', color: '#7fffbf' },
		{ name: 'F', color: '#7fbfff' },
		{ name: 'G', color: '#bf7fff' },
		{ name: 'H', color: '#ff7fbf' },
	];

	let steamInput = '';
	let minHoursInput = '';
	let loading = false;
	let status: StatusMessage | null = null;
	let statusTimer: ReturnType<typeof setTimeout> | null = null;

	let tiers: Tier[] = tierDefaults.slice(0, 4).map((def) => ({ id: `tier-${def.name.toLowerCase()}`, name: def.name, color: def.color, gameIds: [] }));
	let poolIds: string[] = [];
	let gamesById: Record<string, Game> = {};

	let draggedGameId = '';
	let dragOverZone = '';

	let showEditTierModal = false;
	let editingTierIndex = -1;
	let editTierName = '';
	let editR = 255;
	let editG = 127;
	let editB = 127;

	let showCustomGameModal = false;
	let customGameTitle = '';
	let customGameHours = '';
	let customGameImageData = '';
	let customGamePreview = '';

	let tierListElement: HTMLDivElement | undefined;

	onMount(() => {
		const steamId = new URLSearchParams(window.location.search).get('steamid');
		if (steamId) {
			steamInput = steamId;
			void loadGames();
		}
	});

	onDestroy(() => {
		if (statusTimer) {
			clearTimeout(statusTimer);
			statusTimer = null;
		}
	});

	function setStatus(message: string, type: StatusMessage['type'] = 'normal') {
		status = { message, type };
		if (statusTimer) clearTimeout(statusTimer);
		statusTimer = setTimeout(() => {
			status = null;
		}, 5000);
	}

	function clampRgb(value: number | string) {
		const n = Number.parseInt(String(value), 10);
		if (Number.isNaN(n)) return 0;
		return Math.max(0, Math.min(255, n));
	}

	function rgbToHex(r: number | string, g: number | string, b: number | string) {
		const rr = clampRgb(r).toString(16).padStart(2, '0');
		const gg = clampRgb(g).toString(16).padStart(2, '0');
		const bb = clampRgb(b).toString(16).padStart(2, '0');
		return `#${rr}${gg}${bb}`;
	}

	function hexToRgb(hex: string): RgbColor | null {
		if (!hex) return null;
		const v = hex.replace('#', '');
		const expanded = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
		if (expanded.length !== 6) return null;
		const r = Number.parseInt(expanded.slice(0, 2), 16);
		const g = Number.parseInt(expanded.slice(2, 4), 16);
		const b = Number.parseInt(expanded.slice(4, 6), 16);
		if ([r, g, b].some((n) => Number.isNaN(n))) return null;
		return { r, g, b };
	}

	function tierTextColor(color: string) {
		const rgb = hexToRgb(color);
		if (!rgb) return '#000';
		const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
		return brightness > 125 ? '#000' : '#fff';
	}

	function tierFontSize(text: string) {
		const base = 36;
		const len = (text || '').length;
		if (len <= 1) return `${base}px`;
		if (len <= 3) return `${base - 2}px`;
		if (len <= 5) return `${base - 4}px`;
		if (len <= 8) return `${base - 8}px`;
		if (len <= 10) return `${base - 12}px`;
		return `${base - 16}px`;
	}

	function zoneKeyForTier(tierId: string) {
		return `tier:${tierId}`;
	}

	function openEditTier(index: number) {
		const tier = tiers[index];
		if (!tier) return;
		editingTierIndex = index;
		editTierName = tier.name;

		const rgb = hexToRgb(tier.color) || { r: 255, g: 127, b: 127 };
		editR = rgb.r;
		editG = rgb.g;
		editB = rgb.b;
		showEditTierModal = true;
	}

	function closeEditTier() {
		showEditTierModal = false;
		editingTierIndex = -1;
	}

	function saveTierEdit() {
		if (editingTierIndex < 0 || editingTierIndex >= tiers.length) return;
		const name = editTierName.trim() || tiers[editingTierIndex].name;
		const color = rgbToHex(editR, editG, editB);
		tiers = tiers.map((tier, index) => (index === editingTierIndex ? { ...tier, name, color } : tier));
		closeEditTier();
	}

	function addTier() {
		if (tiers.length >= tierDefaults.length) {
			setStatus('Maximum number of tiers reached!', 'error');
			return;
		}
		const used = new Set(tiers.map((tier) => tier.name.toUpperCase()));
		const def = tierDefaults.find((candidate) => !used.has(candidate.name)) ?? tierDefaults[tiers.length];
		tiers = [...tiers, { id: `tier-${Date.now()}-${def.name}`, name: def.name, color: def.color, gameIds: [] }];
		setStatus(`Added tier ${def.name}`, 'success');
	}

	function moveTierUp(index: number) {
		if (index <= 0) return;
		const next = [...tiers];
		[next[index - 1], next[index]] = [next[index], next[index - 1]];
		tiers = next;
	}

	function moveTierDown(index: number) {
		if (index >= tiers.length - 1) return;
		const next = [...tiers];
		[next[index], next[index + 1]] = [next[index + 1], next[index]];
		tiers = next;
	}

	function deleteTier(index: number) {
		const tier = tiers[index];
		if (!tier) return;
		if (!confirm(`Are you sure you want to delete the "${tier.name}" tier? All games will be moved to the game pool.`)) return;

		const nextPool = [...poolIds];
		for (const id of tier.gameIds) {
			if (!nextPool.includes(id)) nextPool.push(id);
		}
		poolIds = nextPool;
		tiers = tiers.filter((_, tierIndex) => tierIndex !== index);
		setStatus(`Deleted tier ${tier.name}`, 'success');
	}

	function resetTierList() {
		if (!confirm('Are you sure you want to reset the tier list? All games will be moved back to the game pool.')) return;
		const nextPool = [...poolIds];
		for (const tier of tiers) {
			for (const id of tier.gameIds) {
				if (!nextPool.includes(id)) nextPool.push(id);
			}
		}
		poolIds = nextPool;
		tiers = tiers.map((tier) => ({ ...tier, gameIds: [] }));
		setStatus('Tier list has been reset', 'success');
	}

	function openCustomGameModal() {
		customGameTitle = '';
		customGameHours = '';
		customGameImageData = '';
		customGamePreview = '';
		showCustomGameModal = true;
	}

	function closeCustomGameModal() {
		showCustomGameModal = false;
	}

	function handleCustomGameImage(event: Event) {
		const input = event.currentTarget as HTMLInputElement | null;
		const [file] = input?.files || [];
		if (!file) {
			customGameImageData = '';
			customGamePreview = '';
			return;
		}

		const reader = new FileReader();
		reader.onload = (loadEvent) => {
			customGameImageData = String(loadEvent.target?.result || '');
			customGamePreview = customGameImageData;
		};
		reader.readAsDataURL(file);
	}

	function addCustomGame() {
		const title = customGameTitle.trim();
		if (!title) {
			setStatus('Game title is required!', 'error');
			return;
		}

		const rawHours = Number.parseFloat(customGameHours);
		const playtime = Number.isFinite(rawHours) && rawHours >= 0 ? Math.round(rawHours * 10) / 10 : 0;
		const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

		gamesById = { ...gamesById, [id]: { id, appid: id, name: title, playtime, isCustom: true, imageData: customGameImageData } };
		poolIds = [...poolIds, id];
		closeCustomGameModal();
		setStatus(`Added custom game: ${title}`, 'success');
	}

	function buildApiEndpoint(input: string) {
		if (/^7656119\d{10}$/.test(input)) return `/api/games?steamid=${encodeURIComponent(input)}`;

		if (input.includes('steamcommunity.com')) {
			if (input.includes('/id/')) {
				let vanity = input.split('/id/')[1] || '';
				vanity = vanity.split('/')[0].split('?')[0];
				if (!vanity) throw new Error('Invalid Steam vanity URL format');
				return `/api/games?vanity=${encodeURIComponent(vanity)}`;
			}

			if (input.includes('/profiles/')) {
				let profile = input.split('/profiles/')[1] || '';
				profile = profile.split('/')[0].split('?')[0];
				if (!profile) throw new Error('Invalid Steam profile URL format');
				return `/api/games?steamid=${encodeURIComponent(profile)}`;
			}

			throw new Error('Invalid Steam URL format');
		}

		return `/api/games?vanity=${encodeURIComponent(input)}`;
	}

	async function loadGames() {
		const value = steamInput.trim();
		const minHours = Number.parseInt(minHoursInput, 10) || 0;
		if (!value) {
			setStatus('Please enter a Steam ID or Vanity URL', 'error');
			return;
		}

		let endpoint = '';
		try {
			endpoint = buildApiEndpoint(value);
		} catch (error) {
			setStatus(error instanceof Error ? error.message : 'Invalid Steam input', 'error');
			return;
		}

		loading = true;
		setStatus('Loading games...', 'normal');

		try {
			const response = await fetch(`${endpoint}&t=${Date.now()}`);
			const body = (await response.json().catch(() => null)) as unknown;
			const apiErrorMessage =
				typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' ? body.message : '';
			if (!response.ok) throw new Error(apiErrorMessage || 'Failed to load games');
			if (!Array.isArray(body) || body.length === 0) throw new Error('No games found or profile is private');

			const loadedGames = body as SteamApiGame[];
			const filtered = loadedGames.filter((g) => Number(g.playtime || 0) >= minHours);
			if (filtered.length === 0) {
				setStatus(`No games found with ${minHours}+ hours of playtime`, 'error');
				return;
			}

			const idsInTiers = new Set(tiers.flatMap((tier) => tier.gameIds));
			const customInPool = poolIds.filter((id) => gamesById[id]?.isCustom);
			const nextGames = { ...gamesById };
			const loadedPool: string[] = [];

			for (const game of filtered) {
				const id = String(game.appid);
				nextGames[id] = { id, appid: game.appid, name: game.name, playtime: Number(game.playtime) || 0, isCustom: false, imageData: '' };
				if (!idsInTiers.has(id)) loadedPool.push(id);
			}

			gamesById = nextGames;
			poolIds = [...new Set([...customInPool, ...loadedPool])];
			setStatus(`Loaded ${filtered.length} games with ${minHours}+ hours (${loadedGames.length} total)`, 'success');
		} catch (error) {
			setStatus(`Error: ${error instanceof Error ? error.message : 'Failed to load games'}`, 'error');
		} finally {
			loading = false;
		}
	}

	function clampInsertIndex(index: number, length: number) {
		if (!Number.isFinite(index)) return length;
		return Math.max(0, Math.min(length, index));
	}

	function getDropIndex(container: HTMLElement, x: number, y: number, movingId: string) {
		const cards = [...container.querySelectorAll<HTMLDivElement>('.game-card[data-game-id]')].filter(
			(card) => card.dataset.gameId !== movingId
		);
		if (cards.length === 0) return 0;

		const closest = cards.reduce(
			(best, child) => {
				const box = child.getBoundingClientRect();
				const xOffset = x - (box.left + box.width / 2);
				const yOffset = y - (box.top + box.height / 2);
				const distance = Math.hypot(xOffset, yOffset);
				if (xOffset > 0) return best;
				if (distance < best.distance) return { element: child, distance };
				return best;
			},
			{ element: null, distance: Number.POSITIVE_INFINITY }
		);

		if (!closest.element) return cards.length;
		return cards.findIndex((card) => card === closest.element);
	}

	function moveGameToZone(gameId: string, zone: string, index: number) {
		if (!gamesById[gameId]) return;

		const strippedPool = poolIds.filter((id) => id !== gameId);
		const strippedTiers = tiers.map((tier) => ({ ...tier, gameIds: tier.gameIds.filter((id) => id !== gameId) }));

		if (zone === 'pool') {
			const nextPool = [...strippedPool];
			nextPool.splice(clampInsertIndex(index, nextPool.length), 0, gameId);
			poolIds = nextPool;
			tiers = strippedTiers;
			return;
		}

		if (!zone.startsWith('tier:')) return;
		const targetTierId = zone.slice(5);
		if (!strippedTiers.some((tier) => tier.id === targetTierId)) return;

		tiers = strippedTiers.map((tier) => {
			if (tier.id !== targetTierId) return tier;
			const nextIds = [...tier.gameIds];
			nextIds.splice(clampInsertIndex(index, nextIds.length), 0, gameId);
			return { ...tier, gameIds: nextIds };
		});
		poolIds = strippedPool;
	}

	function handleDragStart(event: DragEvent, gameId: string) {
		draggedGameId = gameId;
		if (!event.dataTransfer) return;

		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', gameId);

		const source = event.currentTarget as HTMLElement | null;
		if (!source) return;
		const clone = source.cloneNode(true) as HTMLElement;
		clone.style.opacity = '1';
		clone.style.position = 'absolute';
		clone.style.top = '-1000px';
		clone.style.left = '-1000px';
		document.body.appendChild(clone);
		event.dataTransfer.setDragImage(clone, 60, 60);
		setTimeout(() => clone.remove(), 0);
	}

	function handleDragEnd() {
		draggedGameId = '';
		dragOverZone = '';
	}

	function handleZoneDragOver(event: DragEvent, zone: string) {
		event.preventDefault();
		dragOverZone = zone;
	}

	function handleZoneDragLeave(event: DragEvent, zone: string) {
		const related = event.relatedTarget;
		const currentTarget = event.currentTarget as HTMLElement | null;
		if (related && currentTarget?.contains(related as Node)) return;
		if (dragOverZone === zone) dragOverZone = '';
	}

	function handleZoneDrop(event: DragEvent, zone: string) {
		event.preventDefault();
		const gameId = draggedGameId || event.dataTransfer?.getData('text/plain');
		if (!gameId) return;
		const container = event.currentTarget as HTMLElement | null;
		if (!container) return;
		const index = getDropIndex(container, event.clientX, event.clientY, gameId);
		moveGameToZone(gameId, zone, index);
		dragOverZone = '';
	}

	async function waitForImages(container: HTMLElement) {
		const imgs = [...container.querySelectorAll<HTMLImageElement>('img')];
		await Promise.all(
			imgs.map(
				(img) =>
					new Promise<void>((resolve) => {
						if (img.complete) return resolve();
						const done = () => resolve();
						img.addEventListener('load', done, { once: true });
						img.addEventListener('error', done, { once: true });
					})
			)
		);
	}

	async function saveTierListAsImage() {
		if (!tierListElement) {
			setStatus('Tier list is not ready for export', 'error');
			return;
		}

		setStatus('Preparing image...', 'normal');
		const rootStyle = getComputedStyle(document.documentElement);
		const readThemeVar = (name: string, fallback = '') => rootStyle.getPropertyValue(name).trim() || fallback;
		const bgColor = readThemeVar('--bg-color', '#101214');
		const textColor = readThemeVar('--text-color', '#e3e3e3');
		const bodyFont = readThemeVar('--font-family', '"IBM Plex Mono", monospace');
		const displayFont = readThemeVar('--display-font', '"Space Mono", monospace');
		const themeVars = [
			'--bg-color',
			'--text-color',
			'--accent-color',
			'--container-bg',
			'--container-bg-alt',
			'--container-bg-lite',
			'--line-color',
			'--line-strong',
			'--playtime-color',
			'--playtime-pill-bg',
			'--playtime-pill-border',
		];

		const temp = document.createElement('div');
		for (const name of themeVars) {
			const value = readThemeVar(name);
			if (value) temp.style.setProperty(name, value);
		}
		temp.style.backgroundColor = bgColor;
		temp.style.color = textColor;
		temp.style.fontFamily = bodyFont;
		temp.style.padding = '20px';
		temp.style.position = 'fixed';
		temp.style.left = '-9999px';
		temp.style.top = '0';
		temp.style.width = `${Math.max(tierListElement.getBoundingClientRect().width, 980)}px`;
		temp.style.background = bgColor;

		const title = document.createElement('h1');
		title.textContent = 'Steam Library Tier List';
		title.style.color = '#ffffff';
		title.style.fontFamily = displayFont;
		title.style.textAlign = 'center';
		title.style.margin = '0 0 20px';
		temp.appendChild(title);

		const clone = tierListElement.cloneNode(true) as HTMLElement;
		clone.querySelectorAll<HTMLElement>('.tier-actions').forEach((el) => el.remove());
		clone.querySelectorAll<HTMLElement>('.tier').forEach((el) => {
			el.style.gridTemplateColumns = '120px minmax(0, 1fr)';
		});
		clone.querySelectorAll<HTMLElement>('.tier-label').forEach((el) => {
			el.style.gridColumn = '1 / 2';
			el.style.minWidth = '120px';
		});
		clone.querySelectorAll<HTMLElement>('.tier-items').forEach((el) => {
			el.style.gridColumn = '2 / 3';
		});
		clone.querySelectorAll<HTMLElement>('.game-card').forEach((el) => {
			el.classList.add('clone-for-export');
			el.style.animation = 'none';
			el.style.transition = 'none';
			el.style.transform = 'none';
			el.style.opacity = '1';
			el.style.filter = 'none';
		});
		clone.querySelectorAll<HTMLElement>('.game-image').forEach((el) => {
			el.style.opacity = '1';
			el.style.filter = 'none';
		});
		temp.appendChild(clone);
		document.body.appendChild(temp);

		try {
			await waitForImages(temp);
			const canvas = await html2canvas(temp, {
				backgroundColor: bgColor,
				scale: 2,
				useCORS: true,
				allowTaint: true,
			});

			const link = document.createElement('a');
			link.download = 'steam-tier-list.png';
			link.href = canvas.toDataURL('image/png');
			link.click();
			setStatus('Tier list image saved!', 'success');
		} catch (error) {
			setStatus(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
		} finally {
			temp.remove();
		}
	}
</script>

<div class="container">
	<header class="hero">
		<p class="hero-kicker">Steam Library</p>
		<h1>Tier List</h1>
		<p class="hero-subtitle">Rank what you actually play.</p>
	</header>

	{#if status}
		<div class={`status-message ${status.type === 'error' ? 'error' : status.type === 'success' ? 'success' : ''}`}>
			{status.message}
		</div>
	{/if}

	<section class="panel search-panel">
		<h2 class="section-heading">Load Games</h2>
		<form class="search-form" on:submit|preventDefault={loadGames}>
			<input type="text" bind:value={steamInput} placeholder="Enter Steam Vanity URL or Steam ID" />
			<input type="number" min="0" step="1" bind:value={minHoursInput} placeholder="Min Hrs Played" title="Minimum hours played" />
			<button type="submit" disabled={loading}>Load Games</button>
			<div class={`loader ${loading ? 'visible' : ''}`}></div>
		</form>
	</section>

	<div class="panel controls-panel">
		<h2 class="section-heading">Actions</h2>
		<div class="controls">
			<button type="button" on:click={addTier}>Add Tier</button>
			<button type="button" on:click={openCustomGameModal}>Add Custom Game</button>
			<button type="button" on:click={resetTierList}>Reset Tier List</button>
			<button type="button" on:click={saveTierListAsImage}>Save as Image</button>
		</div>
	</div>

	<h2 class="section-heading">Tier Board</h2>
	<div id="tier-list" bind:this={tierListElement}>
		{#each tiers as tier, tierIndex (tier.id)}
			{@const zone = zoneKeyForTier(tier.id)}
			<div class="tier">
				<div class="tier-actions">
					<button type="button" class="tier-action-btn move-up" title="Move Up" on:click={() => moveTierUp(tierIndex)}>^</button>
					<button type="button" class="tier-action-btn move-down" title="Move Down" on:click={() => moveTierDown(tierIndex)}>v</button>
					<button type="button" class="tier-action-btn delete" title="Delete Tier" on:click={() => deleteTier(tierIndex)}>x</button>
				</div>

				<button
					type="button"
					class="tier-label"
					style={`background-color:${tier.color};color:${tierTextColor(tier.color)};font-size:${tierFontSize(tier.name)};`}
					on:click={() => openEditTier(tierIndex)}
				>
					{tier.name}
				</button>

				<div
					class={`tier-items ${dragOverZone === zone ? 'drag-over' : ''}`}
					role="list"
					aria-label={`${tier.name} tier games`}
					on:dragover|preventDefault={(event) => handleZoneDragOver(event, zone)}
					on:dragleave={(event) => handleZoneDragLeave(event, zone)}
					on:drop|preventDefault={(event) => handleZoneDrop(event, zone)}
				>
					{#each tier.gameIds as gameId (gameId)}
						{@const game = gamesById[gameId]}
						{#if game}
							<GameCard
								{game}
								dragging={draggedGameId === gameId}
								{steamIconSvg}
								fallbackImage={noImagePlaceholder}
								onDragStart={handleDragStart}
								onDragEnd={handleDragEnd}
							/>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<h2 class="section-heading">Game Pool</h2>
	<div
		class={`game-pool ${dragOverZone === 'pool' ? 'drag-over' : ''}`}
		role="list"
		aria-label="Game pool"
		on:dragover|preventDefault={(event) => handleZoneDragOver(event, 'pool')}
		on:dragleave={(event) => handleZoneDragLeave(event, 'pool')}
		on:drop|preventDefault={(event) => handleZoneDrop(event, 'pool')}
	>
		{#each poolIds as gameId (gameId)}
			{@const game = gamesById[gameId]}
			{#if game}
				<GameCard
					{game}
					dragging={draggedGameId === gameId}
					{steamIconSvg}
					fallbackImage={noImagePlaceholder}
					onDragStart={handleDragStart}
					onDragEnd={handleDragEnd}
				/>
			{/if}
		{/each}
	</div>
</div>

{#if showEditTierModal}
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click|self={closeEditTier}
		on:keydown={(event) => event.key === 'Escape' && closeEditTier()}
	>
		<div class="modal-content">
			<div class="modal-title">Edit Tier</div>

			<div class="form-group">
				<label for="tier-name-input">Tier Name:</label>
				<input id="tier-name-input" type="text" maxlength="15" bind:value={editTierName} />
			</div>

			<div class="form-group">
				<div class="field-label">Tier Color:</div>
				<div class="rgb-inputs">
					<div class="rgb-input">
						<label for="red-input">R</label>
						<input id="red-input" type="number" min="0" max="255" bind:value={editR} />
					</div>
					<div class="rgb-input">
						<label for="green-input">G</label>
						<input id="green-input" type="number" min="0" max="255" bind:value={editG} />
					</div>
					<div class="rgb-input">
						<label for="blue-input">B</label>
						<input id="blue-input" type="number" min="0" max="255" bind:value={editB} />
					</div>
				</div>

				<div class="color-preview" style={`background-color:${rgbToHex(editR, editG, editB)};`}></div>
				<div class="preset-colors">
					{#each tierColorOptions as color}
						<button
							type="button"
							class="preset-color"
							title={color}
							style={`background-color:${color};`}
							on:click={() => {
								const rgb = hexToRgb(color);
								if (rgb) {
									editR = rgb.r;
									editG = rgb.g;
									editB = rgb.b;
								}
							}}
						></button>
					{/each}
				</div>
			</div>

			<div class="modal-buttons">
				<button type="button" on:click={closeEditTier}>Cancel</button>
				<button type="button" on:click={saveTierEdit}>Save</button>
			</div>
		</div>
	</div>
{/if}

{#if showCustomGameModal}
	<div
		class="modal"
		role="dialog"
		aria-modal="true"
		tabindex="-1"
		on:click|self={closeCustomGameModal}
		on:keydown={(event) => event.key === 'Escape' && closeCustomGameModal()}
	>
		<div class="modal-content">
			<div class="modal-title">Add Custom Game</div>

			<div class="form-group">
				<label for="custom-game-title">Game Title (Required):</label>
				<input id="custom-game-title" type="text" bind:value={customGameTitle} />
			</div>

			<div class="form-group">
				<label for="custom-game-image">Game Image:</label>
				<input id="custom-game-image" type="file" accept="image/*" on:change={handleCustomGameImage} />

				{#if customGamePreview}
					<div class="image-preview-wrap">
						<img src={customGamePreview} alt="Preview" class="image-preview" />
					</div>
				{/if}
			</div>

			<div class="form-group">
				<label for="custom-game-hours">Hours Played (Optional):</label>
				<input id="custom-game-hours" type="number" min="0" step="0.1" placeholder="e.g. 42.5" bind:value={customGameHours} />
			</div>

			<div class="modal-buttons">
				<button type="button" on:click={closeCustomGameModal}>Cancel</button>
				<button type="button" on:click={addCustomGame}>Add Game</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap');

	:global(:root) {
		--bg-color: #101214;
		--text-color: #e3e3e3;
		--accent-color: #8ec7ff;
		--container-bg: #191d22;
		--container-bg-alt: rgba(25, 29, 34, 0.9);
		--container-bg-lite: rgba(25, 29, 34, 0.75);
		--hover-bg: rgba(142, 199, 255, 0.12);
		--success-bg: rgba(91, 194, 122, 0.22);
		--error-bg: rgba(230, 103, 103, 0.2);
		--playtime-color: #8ec7ff;
		--font-family: 'IBM Plex Mono', monospace;
		--display-font: 'Space Mono', monospace;
		--line-color: rgba(227, 227, 227, 0.18);
		--line-strong: rgba(227, 227, 227, 0.34);
		--text-muted-1: rgba(227, 227, 227, 0.56);
		--text-muted-2: rgba(227, 227, 227, 0.68);
		--input-bg: rgba(25, 29, 34, 0.72);
		--tier-actions-bg: rgba(25, 29, 34, 0.9);
		--spinner-track: rgba(227, 227, 227, 0.16);
		--playtime-pill-bg: rgba(142, 199, 255, 0.14);
		--playtime-pill-border: rgba(142, 199, 255, 0.46);
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body),
	:global(body *) {
		user-select: none;
		-webkit-user-select: none;
	}

	:global(body) {
		margin: 0;
		padding: 24px 16px 60px;
		min-height: 100vh;
		background-color: var(--bg-color);
		color: var(--text-color);
		font-family: var(--font-family);
		letter-spacing: 0.01em;
	}

	:global(input),
	:global(button) {
		font: inherit;
	}

	.container {
		max-width: 1180px;
		margin: 0 auto;
		animation: page-in 420ms ease-out both;
	}

	.hero {
		text-align: center;
		margin: 6px 0 26px;
	}

	.hero-kicker {
		margin: 0;
		font-size: 14px;
		color: var(--text-muted-1);
		text-transform: lowercase;
		letter-spacing: 0.06em;
	}

	h1 {
		margin: 6px 0 3px;
		font-family: var(--display-font);
		font-size: clamp(44px, 8vw, 66px);
		line-height: 1;
		letter-spacing: 0.04em;
	}

	.hero-subtitle {
		margin: 0;
		font-size: 15px;
		color: var(--text-muted-2);
		text-transform: lowercase;
	}

	.section-heading {
		margin: 0 0 12px;
		font-size: 32px;
		font-family: var(--display-font);
		line-height: 1;
		letter-spacing: 0.02em;
	}

	.panel,
	#tier-list,
	.game-pool {
		background: var(--container-bg);
		border: 1px solid var(--line-color);
	}

	.panel {
		padding: 18px;
		margin-bottom: 16px;
	}

	.search-panel {
		padding-bottom: 14px;
	}

	.status-message {
		margin-bottom: 16px;
		padding: 11px 13px;
		border: 1px solid var(--line-strong);
		background: var(--container-bg-alt);
		font-size: 14px;
	}

	.status-message.error {
		background: var(--error-bg);
	}

	.status-message.success {
		background: var(--success-bg);
	}

	.search-form {
		display: grid;
		grid-template-columns: minmax(260px, 1fr) 140px auto;
		gap: 10px;
		align-items: center;
	}

	.search-form input {
		height: 42px;
		padding: 8px 11px;
		border: 1px solid var(--line-strong);
		background: var(--input-bg);
		color: var(--text-color);
	}

	:global(input[type='number']) {
		color-scheme: dark;
	}

	:global(input[type='number']::-webkit-inner-spin-button),
	:global(input[type='number']::-webkit-outer-spin-button) {
		opacity: 1;
	}

	.search-form input:focus-visible,
	.form-group input:focus-visible {
		outline: 2px solid var(--accent-color);
		outline-offset: 2px;
	}

	.search-form button,
	.controls button,
	.modal-buttons button {
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--text-color);
		padding: 10px 14px;
		cursor: pointer;
		transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease;
	}

	.search-form button:hover,
	.controls button:hover,
	.modal-buttons button:hover {
		transform: translateY(-1px);
		border-color: var(--accent-color);
		color: var(--accent-color);
		background: var(--hover-bg);
	}

	.search-form button:disabled {
		opacity: 0.6;
		cursor: wait;
		transform: none;
	}

	.loader {
		display: none;
		width: 24px;
		height: 24px;
		border-radius: 999px;
		border: 2px solid var(--spinner-track);
		border-top-color: var(--accent-color);
		animation: spin 0.85s linear infinite;
		justify-self: center;
	}

	.loader.visible {
		display: block;
	}

	.controls-panel {
		padding-bottom: 14px;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	#tier-list {
		padding: 12px;
		display: grid;
		gap: 12px;
	}

	#tier-list + .section-heading {
		margin-top: 26px;
	}

	.tier {
		display: grid;
		grid-template-columns: 34px 120px minmax(0, 1fr);
		min-height: 136px;
		border: 1px solid var(--line-color);
		background: var(--container-bg-alt);
	}

	.tier-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 10px 0;
		border-right: 1px solid var(--line-color);
		background: var(--tier-actions-bg);
	}

	.tier-action-btn {
		width: 23px;
		height: 23px;
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--text-color);
		cursor: pointer;
		font-size: 13px;
		line-height: 1;
	}

	.tier-action-btn:hover {
		border-color: var(--accent-color);
		color: var(--accent-color);
	}

	.tier-action-btn.delete:hover {
		border-color: #d34f4f;
		color: #d34f4f;
	}

	.tier-label {
		border: none;
		border-right: 1px solid var(--line-color);
		cursor: pointer;
		font-weight: 700;
		line-height: 1;
		word-break: break-word;
		padding: 12px;
		text-transform: uppercase;
	}

	.tier-items,
	.game-pool {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px;
		align-content: flex-start;
	}

	.tier-items {
		min-height: 134px;
		background: var(--container-bg-lite);
	}

	.game-pool {
		min-height: 150px;
		background: var(--container-bg);
	}

	.tier-items.drag-over,
	.game-pool.drag-over {
		background: var(--hover-bg);
		border-color: var(--accent-color);
	}

	.modal {
		position: fixed;
		inset: 0;
		background: rgba(15, 15, 15, 0.58);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 14px;
		z-index: 1000;
	}

	.modal-content {
		width: min(390px, 96vw);
		padding: 18px;
		border: 1px solid var(--line-strong);
		background: var(--container-bg);
	}

	.modal-title {
		margin-bottom: 14px;
		font-size: 24px;
		font-family: var(--display-font);
		line-height: 1;
	}

	.form-group {
		margin-bottom: 14px;
	}

	.form-group label,
	.field-label {
		display: block;
		margin-bottom: 6px;
		font-size: 13px;
	}

	.form-group input {
		width: 100%;
		padding: 9px 10px;
		border: 1px solid var(--line-strong);
		background: var(--input-bg);
		color: var(--text-color);
	}

	.form-group input[type='file'] {
		padding: 6px;
	}

	.form-group input[type='file']::file-selector-button,
	.form-group input[type='file']::-webkit-file-upload-button {
		border: 1px solid var(--line-strong);
		background: transparent;
		color: var(--text-color);
		padding: 7px 10px;
		margin-right: 10px;
		cursor: pointer;
		font: inherit;
		transition: border-color 0.2s ease, color 0.2s ease, background-color 0.2s ease;
	}

	.form-group input[type='file']::file-selector-button:hover,
	.form-group input[type='file']::-webkit-file-upload-button:hover {
		border-color: var(--accent-color);
		color: var(--accent-color);
		background: var(--hover-bg);
	}

	.rgb-inputs {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.color-preview {
		width: 100%;
		height: 42px;
		margin-top: 10px;
		border: 1px solid var(--line-strong);
	}

	.preset-colors {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 7px;
		margin-top: 10px;
	}

	.preset-color {
		height: 30px;
		border: 1px solid rgba(0, 0, 0, 0.2);
		cursor: pointer;
	}

	.modal-buttons {
		display: flex;
		justify-content: flex-end;
		gap: 9px;
	}

	.image-preview-wrap {
		margin-top: 10px;
		padding: 7px;
		border: 1px dashed var(--line-strong);
		background: var(--container-bg-lite);
	}

	.image-preview {
		max-width: 100%;
		max-height: 150px;
		display: block;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes page-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.container,
		.loader {
			animation: none;
		}

		.search-form button,
		.controls button,
		.modal-buttons button {
			transition: none;
		}
	}

	@media (max-width: 1000px) {
		.search-form {
			grid-template-columns: 1fr 120px;
		}

		.search-form button {
			grid-column: 1 / -1;
		}

		.loader {
			grid-column: 1 / -1;
		}
	}

	@media (max-width: 860px) {
		.tier {
			grid-template-columns: 34px 92px minmax(0, 1fr);
		}
	}

	@media (max-width: 700px) {
		:global(body) {
			padding: 14px 10px 34px;
		}

		.section-heading {
			font-size: 26px;
		}

		.search-form {
			grid-template-columns: 1fr;
		}

		.tier {
			grid-template-columns: 1fr;
		}

		.tier-actions {
			flex-direction: row;
			justify-content: flex-start;
			padding: 8px 10px;
			border-right: none;
			border-bottom: 1px solid var(--line-color);
		}

		.tier-label {
			border-right: none;
			border-bottom: 1px solid var(--line-color);
			min-height: 72px;
		}
	}
</style>
