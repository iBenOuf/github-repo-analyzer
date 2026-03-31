# GitHub Repository Analyzer

A tool that analyzes GitHub repositories and generates insights about their activity, complexity, and learning difficulty.

## Features

- **Activity Score** (0–100) — based on stars, forks, watchers, and open issues
- **Complexity** (Low / Medium / High) — based on number of languages and repo size
- **Difficulty** (Beginner / Intermediate / Advanced) — based on combined metrics
- Multi-repo analysis — paste multiple URLs at once
- Error handling for invalid URLs, 404s, and rate limits

## How to Run Locally

1. Clone the repo:
```bash
git clone https://github.com/iBenOuf/github-repo-analyzer.git
cd github-repo-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Add your GitHub Personal Access Token to `.env`:
```
GITHUB_TOKEN=your_token_here
```

4. Start the server:
```bash
npm start
```

5. Open `http://localhost:3000` in your browser

## Getting a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name and select the `public_repo` scope
4. Copy the token and paste it into your `.env` file

## Tech Stack

- Node.js + Express (backend)
- Vanilla HTML/CSS/JS (frontend)
- GitHub REST API v3

## License

MIT
