const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const STEAM_API_KEY = process.env.STEAM_API_KEY;

const publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) {
    fs.mkdirSync(publicPath);
}

fs.copyFile(
    path.join(__dirname, 'index.html'), 
    path.join(publicPath, 'index.html'), 
    (err) => {
        if (err) {
            console.error('Error copying index.html:', err);
        }
    }
);

app.use(express.static(publicPath));
app.use(express.json());

app.get('/api/games', async (req, res) => {
    try {
        console.log('API request received with query:', req.query);
        
        if (!STEAM_API_KEY) {
            console.error('Steam API key is missing');
            return res.status(500).json({ 
                success: false, 
                message: 'Steam API key is not configured on the server' 
            });
        }
        
        let steamId = req.query.steamid;
        const vanityUrl = req.query.vanity;
        
        if (vanityUrl && !steamId) {
            try {
                console.log(`Resolving vanity URL: "${vanityUrl}"`);
                const resolveUrl = `https://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${STEAM_API_KEY}&vanityurl=${encodeURIComponent(vanityUrl)}`;
                
                const response = await axios.get(resolveUrl);
                console.log('Vanity URL resolution response:', response.data);
                
                if (response.data.response && response.data.response.success === 1) {
                    steamId = response.data.response.steamid;
                    console.log(`Successfully resolved vanity URL "${vanityUrl}" to Steam ID: ${steamId}`);
                } else {
                    const errorCode = response.data.response ? response.data.response.success : 'unknown';
                    console.error(`Failed to resolve vanity URL "${vanityUrl}", error code: ${errorCode}`);
                    return res.status(400).json({ 
                        success: false, 
                        message: `Could not resolve vanity URL "${vanityUrl}" to a Steam ID. Make sure the vanity URL is correct.` 
                    });
                }
            } catch (error) {
                console.error(`Error resolving vanity URL "${vanityUrl}":`, error.message);
                return res.status(500).json({ 
                    success: false, 
                    message: `Error resolving vanity URL "${vanityUrl}". Server error: ${error.message}` 
                });
            }
        }
        
        if (!steamId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Steam ID or vanity URL is required' 
            });
        }
        
        console.log(`Fetching games for Steam ID: ${steamId}`);
        const gamesUrl = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&format=json`;
        
        const response = await axios.get(gamesUrl);
        console.log('Steam API response received');
        
        if (!response.data.response) {
            console.error('Invalid response from Steam API');
            return res.status(500).json({ 
                success: false, 
                message: 'Invalid response from Steam API' 
            });
        }
        
        if (!response.data.response.games || response.data.response.games.length === 0) {
            console.warn('No games found or profile is private');
            return res.status(404).json({ 
                success: false, 
                message: 'No games found. Make sure your Steam profile is public.' 
            });
        }
        
        const games = response.data.response.games.map(game => {
            return {
                appid: game.appid,
                name: game.name,
                playtime: Math.round(game.playtime_forever / 60)
            };
        });
        
        games.sort((a, b) => a.name.localeCompare(b.name));
        
        console.log(`Returning ${games.length} games for Steam ID ${steamId}`);
        res.json(games);
        
    } catch (error) {
        console.error('Error fetching games:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching games from Steam API' 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Steam API Key ${STEAM_API_KEY ? 'is' : 'is NOT'} configured`);
});