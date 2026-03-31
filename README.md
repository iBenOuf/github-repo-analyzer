# GitHub Repository Intelligence Analyzer

A tool that analyzes GitHub repositories and generates insights about their activity, complexity, and learning difficulty. Built for GSoC 2026 Pre-Task — WebiU @ C2SI.

🌐 **Live Demo:** https://github-repo-analyzer.benouf.dev/

---

## What it does

Paste one or more GitHub repository URLs and get a structured report for each one:

- **Activity Score** (0–100) — how active the repository is
- **Complexity** (Low / Medium / High) — how complex the codebase is
- **Difficulty** (Beginner / Intermediate / Advanced) — how hard it is to learn/contribute

---

## Scoring Formulas

### Activity Score (out of 100)

| Metric | Formula | Max Points |
|---|---|---|
| Stars | stars ÷ 1000 | 40 pts |
| Forks | forks ÷ 500 | 30 pts |
| Watchers | watchers ÷ 200 | 20 pts |
| Open Issues | openIssues ÷ 100 | 10 pts |

Total = sum of all, capped at 100.

### Complexity Estimation

Based on language diversity and repository size:

| Condition | Complexity |
|---|---|
| 5+ languages OR size > 50MB | High |
| 3+ languages OR size > 10MB | Medium |
| otherwise | Low |

### Learning Difficulty Classification

| Condition | Difficulty |
|---|---|
| activityScore > 60 OR complexity = High OR stars > 10,000 | Advanced |
| activityScore > 30 OR complexity = Medium OR stars > 1,000 | Intermediate |
| otherwise | Beginner |

---

## Sample Outputs

| Repository | Stars | Forks | Activity | Complexity | Difficulty |
|---|---|---|---|---|---|
| facebook/react | 244,289 | 50,871 | 100/100 | High | Advanced |
| angular/angular | 100,104 | 27,149 | 100/100 | High | Advanced |
| nestjs/nest | 75,017 | 8,272 | 77/100 | High | Advanced |
| expressjs/express | 68,886 | 22,985 | 92/100 | Low | Advanced |
| c2siorg/Webiu | 40 | 115 | 2/100 | High | Advanced |

---

## Edge Cases Handled

- Invalid or malformed URLs → returns a clear error per repo
- Repository not found (404) → returns "Repository not found"
- GitHub API rate limit hit (403) → returns "Rate limit reached"
- Missing or empty data fields → uses safe fallback values

---

## Rate Limit Handling

- Uses authenticated GitHub API requests: 5,000 requests/hour (vs 60 unauthenticated)
- Each repository analysis uses exactly 2 API calls (repo data + languages)
- Returns a clear error message if rate limit is exhausted
- Token is stored server-side as an environment variable — never exposed to the client

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Frontend | Vanilla HTML, CSS, JavaScript |
| API | GitHub REST API v3 (via Axios) |
| Deployment | Custom domain via reverse proxy |

---

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
PORT=3000
```

4. Start the server:
```bash
npm start
```

5. Open `http://localhost:3000` in your browser

---

## Getting a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a name and select the `public_repo` scope
4. Copy the token and paste it into your `.env` file

---

## Assumptions & Limitations

- Activity score is based on static metrics (stars, forks, watchers, issues) — not real-time commit frequency, as that would require additional API calls per repo
- Complexity is estimated from language count and repo size, not actual code analysis
- Difficulty classification uses thresholds that work well for most repos but may not perfectly reflect niche or archived projects
- Rate limit of 5,000 requests/hour is sufficient for analyzing hundreds of repos per hour

---

## License

MIT
