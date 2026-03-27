import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT ? Number(process.env.PORT) : 5050;

const GQL = `{
  organization(login: "wix-private") {
    projectV2(number: 365) {
      items(first: 100) {
        nodes {
          fieldValues(first: 10) {
            nodes {
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
                field { ... on ProjectV2SingleSelectField { name } }
              }
            }
          }
          content {
            ... on Issue {
              number
              title
              url
              repository { name }
              labels(first: 10) { nodes { name } }
              assignees(first: 5) { nodes { login avatarUrl } }
            }
          }
        }
      }
    }
  }
}`;

function fetchProjectData() {
  return new Promise((resolve, reject) => {
    execFile('gh', ['api', 'graphql', '-f', `query=${GQL}`], (err, stdout, stderr) => {
      if (err) {
        // Fall back to committed data.json when gh is unavailable (e.g. CI)
        try {
          const fallback = JSON.parse(readFileSync(join(__dirname, 'data.json'), 'utf8'));
          return resolve(fallback.tickets ?? fallback);
        } catch {
          return reject(stderr || err.message);
        }
      }
      try {
        const raw = JSON.parse(stdout);
        const items = raw.data.organization.projectV2.items.nodes;

        const tickets = items
          .filter(item => item.content?.number)
          .map(item => {
            const status = item.fieldValues.nodes
              .find(fv => fv?.field?.name === 'Status')?.name ?? 'No Status';
            return {
              number: item.content.number,
              title: item.content.title,
              url: item.content.url,
              repo: item.content.repository.name,
              labels: item.content.labels.nodes.map(l => l.name),
              assignees: item.content.assignees.nodes.map(a => ({ login: a.login, avatarUrl: a.avatarUrl })),
              status,
            };
          })
          .filter(t => t.labels.some(l => l.toLowerCase() === 'add to cart'))
          .sort((a, b) => {
            const order = ['To triage', 'Done'];
            return order.indexOf(a.status) - order.indexOf(b.status);
          });

        resolve(tickets);
      } catch (e) {
        reject(e.message);
      }
    });
  });
}

createServer(async (req, res) => {
  if (req.url === '/api/data') {
    try {
      const data = await fetchProjectData();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  try {
    const file = readFileSync(join(__dirname, 'index.html'), 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(file);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
}).listen(PORT, () => {
  console.log(`Dashboard running at http://localhost:${PORT}`);
});
