import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  throw new Error('GITHUB_TOKEN Environment Variable nicht gesetzt!');
}

// GitHub API Helper
async function githubFetch(
  endpoint: string,
  method: string = 'GET',
  body?: any
) {
  const response = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`GitHub API: ${error.message}`);
  }

  return response.json();
}

// Endpoints

// GET /repos/:owner - Alle Repos eines Owners
app.get('/repos/:owner', async (req, res) => {
  try {
    const repos = await githubFetch(`/users/${req.params.owner}/repos`);
    res.json({
      success: true,
      repos: repos.map((r: any) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        private: r.private,
        stars: r.stargazers_count
      }))
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /branches/:owner/:repo - Alle Branches eines Repos
app.get('/branches/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubFetch(`/repos/${owner}/${repo}/branches`);
    res.json({
      success: true,
      branches: branches.map((b: any) => ({
        name: b.name,
        protected: b.protected
      }))
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /push - Datei zu GitHub pushen
app.post('/push', async (req, res) => {
  try {
    const { owner, repo, branch, file_path, content, message } = req.body;

    if (!owner || !repo || !branch || !file_path || !content || !message) {
      return res.status(400).json({
        success: false,
        error: 'Erforderlich: owner, repo, branch, file_path, content, message'
      });
    }

    const base64Content = Buffer.from(content).toString('base64');

    // SHA prüfen
    let sha: string | undefined;
    try {
      const existing = await githubFetch(
        `/repos/${owner}/${repo}/contents/${file_path}?ref=${branch}`
      );
      sha = existing.sha;
    } catch (e) {
      // Datei existiert nicht
    }

    const result = await githubFetch(
      `/repos/${owner}/${repo}/contents/${file_path}`,
      'PUT',
      {
        message,
        content: base64Content,
        branch,
        ...(sha && { sha })
      }
    );

    res.json({
      success: true,
      file: result.content.name,
      commit: result.commit.sha,
      message: result.commit.message,
      url: result.content.html_url
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// GET /file/:owner/:repo/:filePath - Datei von GitHub holen
app.get('/file/:owner/:repo/*', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const filePath = req.params[0];
    const branch = req.query.branch || 'main';

    const file = await githubFetch(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`
    );

    const content = Buffer.from(file.content, 'base64').toString('utf-8');
    res.json({
      success: true,
      name: file.name,
      path: file.path,
      size: file.size,
      content
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ready: !!GITHUB_TOKEN });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ GitHub Server läuft auf Port ${PORT}`);
  console.log(`📡 http://localhost:${PORT}`);
});
