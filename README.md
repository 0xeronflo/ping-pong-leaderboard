# 🏓 Ping Pong ELO Tracker

A web application for tracking ping pong game results and generating ELO rankings for players.

## Features

- 📊 **Real-time Leaderboard** - View current player rankings by ELO rating
- 🎮 **Game Entry** - Quick and easy game result recording
- 📈 **ELO Progression Charts** - Visual representation of player performance over time
- 📉 **Detailed Statistics** - Win rates, streaks, head-to-head records, and more
- 👥 **Player Management** - Add and manage players
- 🕐 **Game History** - Complete history of all matches with ELO changes

## Tech Stack

### Backend
- Node.js + Express
- SQLite database
- Standard ELO rating system (K-factor: 32, Initial rating: 1500)

### Frontend
- React with Vite
- TailwindCSS for styling
- Recharts for data visualization
- React Router for navigation

## Getting Started

### Prerequisites
- Node.js (v20 or higher recommended)
- npm or yarn

### Installation

1. **Install backend dependencies**
```bash
cd server
npm install
```

2. **Install frontend dependencies**
```bash
cd client
npm install
```

### Running the Application

1. **Start the backend server** (from the `server` directory)
```bash
npm run dev
```
The API will run on `http://localhost:3001`

2. **Start the frontend development server** (from the `client` directory)
```bash
npm run dev
```
The app will open in your browser at `http://localhost:3000`

## API Endpoints

### Players
- `GET /api/players` - Get all players sorted by ELO
- `POST /api/players` - Create new player
- `GET /api/players/:id` - Get player details
- `GET /api/players/:id/stats` - Get detailed player statistics
- `GET /api/players/:id/elo-history` - Get ELO progression data

### Games
- `GET /api/games` - Get game history (with pagination)
- `POST /api/games` - Record a new game
- `GET /api/games/:id` - Get specific game details

## Database Schema

### Players Table
- `id` - Unique identifier
- `name` - Player name (unique)
- `current_elo` - Current ELO rating (default: 1500)
- `games_played` - Total games played
- `wins` - Total wins
- `losses` - Total losses
- `created_at` - Registration date

### Games Table
- `id` - Unique identifier
- `player1_id`, `player2_id` - Player references
- `player1_score`, `player2_score` - Game scores
- `winner_id` - Winner reference
- `player1_elo_before/after` - ELO ratings before/after
- `player2_elo_before/after` - ELO ratings before/after
- `elo_change` - ELO points exchanged
- `played_at` - Game timestamp

## ELO Rating System

The app uses the standard ELO rating formula:

```
Expected Score = 1 / (1 + 10^((opponent_elo - player_elo) / 400))
New Rating = Old Rating + K * (Actual Score - Expected Score)
```

- **K-factor**: 32 (determines rating sensitivity)
- **Initial Rating**: 1500
- **Actual Score**: 1 for win, 0 for loss

## Deployment

### Backend Deployment (Railway/Render)
1. Create a new service on Railway or Render
2. Connect your Git repository
3. Set environment variables:
   - `PORT=3001`
   - `DATABASE_PATH=./data/pingpong.db`
4. Deploy

### Frontend Deployment (Vercel/Netlify)
1. Create a new project on Vercel or Netlify
2. Connect your Git repository
3. Set build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Set environment variable:
   - `VITE_API_URL=<your-backend-url>/api`
5. Deploy

## Development

### Project Structure
```
hiive-table-tennis/
├── server/                 # Backend API
│   ├── src/
│   │   ├── db/            # Database setup and schema
│   │   ├── services/      # ELO calculation logic
│   │   ├── routes/        # API endpoints
│   │   └── server.js      # Express app
│   └── package.json
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API client
│   │   └── App.jsx        # Main app component
│   └── package.json
└── README.md
```

## License

MIT

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
