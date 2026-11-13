import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const validSha = value => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);

export function checkHistory(commits, total, head) {
  if (!Array.isArray(commits) || !Number.isSafeInteger(total) || total < 1 ||
      commits.length !== total || !validSha(head) ||
      commits.some(commit => !validSha(commit?.sha)) ||
      new Set(commits.map(commit => commit.sha)).size !== total || commits.at(-1)?.sha !== head) {
    throw new Error('Incomplete PR history; refusing to infer a verified branch.');
  }
  for (const commit of commits) {
    const parents = commit.parents;
    if (!Array.isArray(parents) || parents.length < 1 ||
        parents.some(parent => !validSha(parent?.sha) || parent.sha === commit.sha) ||
        new Set(parents.map(parent => parent.sha)).size !== parents.length) {
      throw new Error(`Invalid PR commit parents: ${commit.sha}`);
    }
  }
  // Source branches may preserve sync/integration merges. develop stays linear
  // through squash-only protection; topology is not proof of review or quality.
  return commits.filter(commit => commit.parents.length > 1).map(commit => commit.sha);
}

export async function auditHistory(event, repository, request) {
  const pr = event.pull_request;
  if (!pr) throw new Error('Expected a pull_request event.');
  if (pr.base.ref !== 'develop') return { status: 'release-policy', base: pr.base.ref };
  const base = pr.base.sha, head = pr.head.sha;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || pr.base.repo.full_name !== repository ||
      ![base, head].every(sha => /^[0-9a-f]{40}$/.test(sha))) throw new Error('Invalid PR identity.');
  // Compare immutable SHAs, not mutable branch names or the synthetic PR merge.
  // Audit the complete introduced history, including merges on later pages.
  const path = `/repos/${repository}/compare/${base}...${head}`;
  const first = await request(`${path}?per_page=100&page=1`);
  const total = first?.total_commits;
  if (!Number.isSafeInteger(total) || total < 1) throw new Error('Invalid comparison size.');
  if (first.base_commit?.sha !== base) throw new Error('Comparison base mismatch.');
  if (!Array.isArray(first.commits)) throw new Error('Incomplete PR history page.');
  const commits = [...first.commits];
  for (let page = 2; page <= Math.ceil(total / 100); page++) {
    const next = await request(`${path}?per_page=100&page=${page}`);
    if (next?.total_commits !== total || next?.base_commit?.sha !== base) throw new Error('Comparison identity changed.');
    if (!Array.isArray(next.commits)) throw new Error('Incomplete PR history page.');
    commits.push(...next.commits);
  }
  const mergeCommits = checkHistory(commits, total, head);
  return { status: mergeCommits.length ? 'nonlinear' : 'linear', base, head, commits: total, mergeCommits };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const request = async path => {
      const response = await fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}${path}`, {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error(`History lookup failed: HTTP ${response.status}.`);
      return response.json();
    };
    console.log(JSON.stringify(await auditHistory(event, process.env.GITHUB_REPOSITORY, request)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
