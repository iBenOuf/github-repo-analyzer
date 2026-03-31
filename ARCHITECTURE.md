# Scalable GitHub Data Aggregation System — Architecture Design

**Author:** Abdelrahman Mohamed  
**GitHub:** github.com/iBenOuf  
**GSoC 2026 Pre-Task — WebiU @ C2SI**

---

## Objective

Design a scalable system that aggregates repository data from 300+ GitHub repositories, serves it efficiently to a website, minimizes GitHub API usage, and automatically updates when repositories change.

---

## Architecture Overview

The system is divided into 5 layers:

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (Angular)                │
│         Requests data via REST API                  │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP Request
┌───────────────────────▼─────────────────────────────┐
│                  API LAYER (NestJS)                 │
│     Handles requests, checks cache first            │
└───────────┬───────────────────────┬─────────────────┘
            │ Cache Miss            │ Cache Hit
┌───────────▼───────────┐  ┌───────▼─────────────────┐
│   PROCESSING LAYER    │  │    CACHE LAYER (Redis)  │
│  Fetches & processes  │  │  Returns cached data    │
│  data from GitHub API │  │  instantly              │
└───────────┬───────────┘  └─────────────────────────┘
            │
┌───────────▼───────────────────────────────────────┐
│              STORAGE LAYER (PostgreSQL)           │
│         Stores processed repository data          │
└───────────────────────────────────────────────────┘
            ▲
┌───────────┴───────────────────────────────────────┐
│           DATA INGESTION LAYER                    │
│   GitHub Webhooks + Scheduled Jobs (cron)         │
└───────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Data Ingestion Layer
Responsible for fetching data from GitHub and keeping it up to date.

**Two mechanisms:**
- **GitHub Webhooks** — GitHub sends a POST request to our server whenever a repo event happens (push, new issue, new PR, new star). This triggers an immediate update for that specific repo.
- **Scheduled Jobs (cron)** — A background job runs every 6 hours to sync all repos in bulk. This catches any missed webhook events and keeps data fresh.

### 2. Processing Layer
Receives raw data from GitHub API and transforms it into a clean, structured format before storing.

- Normalizes field names and data types
- Calculates derived metrics (activity score, complexity)
- Filters out fields that are not needed
- Handles missing or null fields safely

### 3. Storage Layer (PostgreSQL)
Stores processed repository data persistently.

**What to store persistently:**
- Repository name, description, owner
- Stars, forks, watchers, open issues count
- Primary language and language list
- Last updated timestamp
- Calculated activity score and complexity

**What to fetch dynamically (not stored):**
- Real-time contributor counts (changes too frequently)
- Individual commit details (too large to store)
- Raw file contents

### 4. Cache Layer (Redis)
Sits between the API layer and the database. Stores the most frequently requested data in memory for fast access.

- Cache TTL (time to live): 15 minutes for repo lists, 5 minutes for individual repo data
- When a webhook triggers an update, the relevant cache key is invalidated immediately
- Reduces database queries by ~90% for read-heavy traffic

### 5. API Layer (NestJS)
Exposes REST endpoints to the frontend.

- Always checks Redis cache first
- On cache miss: queries PostgreSQL, stores result in Redis, returns to client
- Handles authentication, rate limiting, and error responses

---

## Rate Limit Handling

GitHub API allows 5,000 requests/hour with authentication.

**Strategies:**

1. **Store data in PostgreSQL** — frontend never calls GitHub directly. All requests go through our database.
2. **Webhook-first updates** — only fetch from GitHub when something actually changes, not on every user request.
3. **Batch scheduled jobs** — use GitHub's GraphQL API to fetch up to 100 repos in a single request instead of one by one.
4. **Rate limit monitoring** — check `X-RateLimit-Remaining` header on every GitHub API response. If below 100, pause non-urgent requests and queue them.
5. **Multiple tokens** — for very large scale, rotate between multiple GitHub tokens to multiply the rate limit.

---

## Update Mechanism

**Primary: GitHub Webhooks**
- Register a webhook on each repository pointing to `/webhooks/github`
- When GitHub sends an event (push, issues, stars), the ingestion layer fetches only that repo's updated data
- Fast, real-time, and efficient — only triggers when something changes

**Fallback: Scheduled Jobs**
- A cron job runs every 6 hours using a NestJS scheduler
- Syncs all repos in batches of 100 using GitHub GraphQL API
- Catches any repos whose webhooks may have failed or been missed

---

## Data Storage Strategy

| Data Type | Storage | Reason |
|---|---|---|
| Repo metadata (name, stars, forks) | PostgreSQL | Changes infrequently, needs persistence |
| Language list | PostgreSQL | Stable, useful for filtering |
| Activity scores | PostgreSQL | Pre-calculated to avoid repeated computation |
| API responses for frequent endpoints | Redis | Fast in-memory access, short TTL |
| Individual commit history | Not stored | Too large, fetched dynamically if needed |
| Raw file contents | Not stored | Not needed for display |

---

## Scalability Plan (300 to 10,000 repos)

| Challenge | Solution |
|---|---|
| More GitHub API calls needed | Use GraphQL to batch 100 repos per request instead of 1 |
| Database gets slower with more rows | Add indexes on frequently queried columns (org, language, stars) |
| More frontend traffic | Scale Redis horizontally, add read replicas for PostgreSQL |
| Webhook registration for 10k repos | Use GitHub org-level webhooks instead of per-repo webhooks |
| Processing backlog | Use a job queue (Bull + Redis) to process updates asynchronously |

---

## Performance Optimization

1. **Redis caching** — most read requests never hit the database
2. **Pagination** — API returns repos in pages of 20, not all at once
3. **Indexed queries** — PostgreSQL indexes on org, language, stars, updated_at
4. **Pre-calculated scores** — activity and complexity scores computed at ingestion time, not at request time
5. **GZIP compression** — all API responses compressed before sending to frontend
6. **CDN** — static frontend assets served via CDN, not the app server

---

## Failure Handling

| Failure Type | Handling Strategy |
|---|---|
| GitHub API returns 403 (rate limit) | Pause requests, wait for reset, log warning |
| GitHub API returns 404 (repo not found) | Mark repo as unavailable in DB, skip in responses |
| GitHub API returns 500 | Retry up to 3 times with exponential backoff |
| Webhook delivery fails | Scheduled job catches missed updates every 6 hours |
| Redis goes down | Fall through to PostgreSQL directly, log alert |
| PostgreSQL goes down | Return cached data from Redis, log critical alert |

---

## API Flow

```
User opens website
       │
       ▼
Frontend (Angular) sends GET /api/projects
       │
       ▼
NestJS API Layer receives request
       │
       ├── Check Redis cache
       │       │
       │    Hit ──────────────────► Return cached data to frontend
       │       │
       │    Miss
       │       │
       │       ▼
       │   Query PostgreSQL
       │       │
       │       ▼
       │   Store result in Redis (TTL: 15 min)
       │       │
       │       ▼
       └──────────────────────────► Return data to frontend
```

---

## Technology Choices

| Technology | Role | Justification |
|---|---|---|
| **NestJS** | API + Processing Layer | TypeScript, modular architecture, built-in scheduler and caching support. Already used in WebiU. |
| **PostgreSQL** | Primary Database | Reliable, supports complex queries, good with structured repo data |
| **Redis** | Cache Layer | In-memory, extremely fast reads, native TTL support |
| **GitHub REST API v3** | Data Source | Well documented, sufficient for repo metadata |
| **GitHub GraphQL API** | Batch Fetching | Fetch 100 repos in one request vs 100 separate REST calls |
| **GitHub Webhooks** | Real-time Updates | Push-based, no polling needed |
| **Bull** | Job Queue | Handles async processing and retries for ingestion jobs |
| **Angular** | Frontend | Already used in WebiU |
| **Docker** | Containerization | Consistent environments, easy deployment |

---

## Summary

This architecture ensures:
- **Low GitHub API usage** — data is stored locally, webhooks trigger targeted updates
- **Fast response times** — Redis cache serves most requests in under 10ms
- **Real-time updates** — webhooks push changes immediately without polling
- **Fault tolerance** — multiple fallback layers if any component fails
- **Scalability** — GraphQL batching and horizontal scaling handle growth from 300 to 10,000+ repos
