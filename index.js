const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
};

function getActivityScore(stars, forks, openIssues, watchers) {
    const score =
        Math.min(stars / 1000, 40) +
        Math.min(forks / 500, 30) +
        Math.min(watchers / 200, 20) +
        Math.min(openIssues / 100, 10);
    return Math.round(score);
}

function getComplexity(languageCount, repoSizeKB) {
    if (languageCount >= 5 || repoSizeKB > 50000) return "High";
    if (languageCount >= 3 || repoSizeKB > 10000) return "Medium";
    return "Low";
}

function getDifficulty(activityScore, complexity, stars) {
    if (activityScore > 60 || complexity === "High" || stars > 10000)
        return "Advanced";
    if (activityScore > 30 || complexity === "Medium" || stars > 1000)
        return "Intermediate";
    return "Beginner";
}

function parseRepoUrl(url) {
    const clean = url.replace("https://github.com/", "").replace(/\/$/, "");
    const parts = clean.split("/");
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1] };
}

app.post("/analyze", async (req, res) => {
    const { repos } = req.body;

    if (!repos || repos.length === 0) {
        return res
            .status(400)
            .json({ error: "Please provide at least one repo URL" });
    }

    const results = [];

    for (const repoUrl of repos) {
        const parsed = parseRepoUrl(repoUrl.trim());

        if (!parsed) {
            results.push({ url: repoUrl, error: "Invalid URL format" });
            continue;
        }

        try {
            const repoRes = await axios.get(
                `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
                { headers: githubHeaders },
            );

            const langRes = await axios.get(
                `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/languages`,
                { headers: githubHeaders },
            );

            const data = repoRes.data;
            const languages = Object.keys(langRes.data);

            const activityScore = getActivityScore(
                data.stargazers_count,
                data.forks_count,
                data.open_issues_count,
                data.watchers_count,
            );

            const complexity = getComplexity(languages.length, data.size);
            const difficulty = getDifficulty(
                activityScore,
                complexity,
                data.stargazers_count,
            );

            results.push({
                name: data.full_name,
                description: data.description || "No description",
                stars: data.stargazers_count,
                forks: data.forks_count,
                openIssues: data.open_issues_count,
                watchers: data.watchers_count,
                languages: languages,
                activityScore,
                complexity,
                difficulty,
                url: data.html_url,
            });
        } catch (err) {
            if (err.response?.status === 404) {
                results.push({ url: repoUrl, error: "Repository not found" });
            } else if (err.response?.status === 403) {
                results.push({
                    url: repoUrl,
                    error: "GitHub API rate limit reached",
                });
            } else {
                results.push({
                    url: repoUrl,
                    error: "Failed to fetch repository data",
                });
            }
        }
    }

    res.json({ results });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
