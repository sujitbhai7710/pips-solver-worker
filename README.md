# Pips Answer Website - Cloudflare Worker

This worker serves as the backend API for the Pips Answer website. It mangages puzzle data, generates AI explanations, and automates daily updates.

## Technology Stack
- **Framework**: [Hono](https://hono.dev/)
- **Platform**: Cloudflare Workers
- **Database**: Cloudflare D1
- **AI**: Google Gemini (gemini-3-flash-preview)
- **Deployment**: Wrangler

## Endpoints

### 🔓 Public Data Retrieval

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Health check - returns "Pips Worker API is running." |
| `/today` | `GET` | Get puzzle data and AI explanation for the current day (UTC+14). |
| `/yesterday` | `GET` | Get puzzle data and AI explanation for yesterday. |
| `/date/:date` | `GET` | Get data for a specific date (Format: `YYYY-MM-DD`). |
| `/date/:date/:difficulty` | `GET` | Get specific difficulty (`easy`, `medium`, `hard`) for a date. |
| `/id/:id` | `GET` | Search for a puzzle by its unique NYT ID. |
| `/list` | `GET` | Paginated list of puzzles. Query params: `page`, `limit`. |
| `/search/region/:type` | `GET` | Search puzzles by region type (e.g., world, state). |
| `/constructor/:name` | `GET` | Search puzzles by constructor name. |
| `/editor/:name` | `GET` | Search puzzles by editor name. |

### 🔒 Management (Requires `:key`)
The `:key` parameter must match the `SECRET_KEY` defined in the worker environment variables.

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/add/:date/:key` | `GET` | Manually fetch from NYT, generate AI explanation, and save to DB. |
| `/delete/:date/:key` | `GET` | Delete a specific date from the database. |
| `/trigger-cron/:key` | `GET` | Manually trigger the daily automated tasks. |

## 🤖 Automated Tasks

### Scheduled Handler (Cron)
The worker is configured to run at **12:00 AM UTC daily**. During this run:
1. **Auto-Fetch**: It checks for the next 2 days of puzzles and adds them to the database if missing.
2. **AI Generation**: It uses the Gemini API to generate detailed expert analyses for each new puzzle.
3. **GitHub Sync**: It updates a `today.json` file in the configured GitHub repository with the current day's content for static delivery.

## ⚙️ Configuration (wrangler.toml)

The following environment variables/secrets are required:
- `DB`: D1 Database binding.
- `SECRET_KEY`: Security key for management endpoints.
- `GEMINI_API_KEYS`: A comma-separated list of Gemini API keys for load balancing.
- `GITHUB_TOKEN`: Personal access token with repo scope.
- `GITHUB_OWNER`: GitHub username or organization.
- `GITHUB_REPO`: Repository name.
- `GITHUB_BRANCH`: Target branch (e.g., `main`).
- `GITHUB_PATH`: Path to `today.json` in the repo (e.g., `frontend/public/today.json`).

## 🛠️ Development & Deployment

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Deploy to Cloudflare
npm run deploy
```
