# Steam Library Tier List

A web application that allows you to create tier lists for your Steam games library.

## Features

- Load your Steam games by Steam ID or Vanity URL
- Filter games by minimum playtime hours
- Drag and drop games into customizable tiers
- Customize tier names and colors
- Save your tier list as an image

## Installation

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env` file in the root directory and add your Steam API key:
   ```
   STEAM_API_KEY=your_api_key_here
   ```
   If you don't have a Steam API key, you can get one at https://steamcommunity.com/dev/apikey

4. Run the application:
   ```
   npm start
   ```
   
5. Or use the included batch file:
   ```
   click_me.bat
   ```

6. Open your browser and navigate to http://localhost:3000

## How to Use

1. Enter your Steam ID or vanity URL in the input field
2. Optionally set a minimum hours filter
3. Click "Load Games" to fetch your games library
4. Drag games from the game pool into different tiers
5. Customize tiers by clicking on tier labels
6. Add more tiers with the "Add Tier" button
7. Save your tier list as an image with the "Save as Image" button

## Requirements

- Node.js
- A Steam account with public game data
- A Steam API key

## License

This project is licensed under the MIT License - see the LICENSE file for details.