# Steam Library Tier List

A SvelteKit app that pulls your Steam library through the Steam Web API and lets you
rank your games on a drag-and-drop tier list, then export the result as a PNG.

## Features

- Load a library by 17-digit Steam ID, `steamcommunity.com/id/...` or
  `steamcommunity.com/profiles/...` URL, or bare vanity name — vanity names are
  resolved server-side via `ISteamUser/ResolveVanityURL`.
- Server-side API proxy (`src/routes/api/games/+server.ts`) keeps the Steam API key
  off the client; responses are sent with `cache-control: no-store`.
- Drag and drop games between the pool and tiers, with insertion-index reordering.
- Add, rename, recolor (RGB picker), reorder, and delete tiers.
- Import custom entries with your own image, title, and playtime for games not in
  the library.
- Game cards show capsule art, playtime, a Steam store link, and a tilt effect on
  hover.
- Export the tier list to PNG via `html2canvas` — renders an off-screen clone with
  theme CSS variables inlined so the image matches the page.
- `?steamid=` query param auto-loads a library on page load.
- `/healthz` endpoint and hardened response headers (`hooks.server.ts`) for
  deployment.

## Setup

Requires Node.js and a Steam Web API key (get one at
https://steamcommunity.com/dev/apikey).

```sh
npm install
```

Create a `.env` file in the repo root (it is gitignored):

```
STEAM_API_KEY=your_api_key_here
```

## Run

```sh
npm run dev        # dev server with HMR on http://localhost:5173
npm run build      # production build (adapter-node) into build/
npm start          # build + serve on http://localhost:3000
npm run preview    # vite preview
npm run check      # svelte-check type checking
```

## Usage

1. Paste a Steam ID, profile URL, or vanity name and click Load Games.
   Your profile's game details must be public.
2. Optionally set a minimum-hours filter to hide unplayed games.
3. Drag games into tiers; use the tier menu to edit or add tiers.
4. Click Save as Image to download a PNG of the tier list.

## Known limitations

- No persistence — the tier list lives in memory and is lost on refresh.
- Steam only returns games for profiles with public game details.
- Export fidelity depends on `html2canvas`; complex CSS may render slightly
  differently than on screen.

## License

MIT — see [LICENSE](LICENSE).
