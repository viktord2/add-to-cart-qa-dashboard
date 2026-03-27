import json, sys, datetime

raw = json.load(sys.stdin)
nodes = raw['data']['organization']['projectV2']['items']['nodes']

print(f'DEBUG: total items = {len(nodes)}', file=sys.stderr)
for item in nodes[:5]:
    c = item.get('content') or {}
    labels = [l['name'] for l in c.get('labels', {}).get('nodes', [])]
    print(f'  DEBUG #{c.get("number","N/A")} labels={labels}', file=sys.stderr)

tickets = []
for item in nodes:
    content = item.get('content')
    if not content or 'number' not in content:
        continue
    labels = [l['name'] for l in content.get('labels', {}).get('nodes', [])]
    if not any(l.lower() == 'add to cart' for l in labels):
        continue
    status = next(
        (fv['name'] for fv in item['fieldValues']['nodes']
         if fv.get('field', {}).get('name') == 'Status'),
        'No Status'
    )
    tickets.append({
        'number': content['number'],
        'title': content['title'],
        'url': content['url'],
        'repo': content['repository']['name'],
        'labels': labels,
        'status': status,
    })

print(f'DEBUG: matched tickets = {len(tickets)}', file=sys.stderr)
result = {'tickets': tickets, 'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'}
print(json.dumps(result))
