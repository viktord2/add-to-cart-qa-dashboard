import json, sys, datetime

raw = json.load(sys.stdin)
nodes = raw['data']['organization']['projectV2']['items']['nodes']

tickets = []
for item in nodes:
    content = item.get('content')
    if not content or 'number' not in content:
        continue
    labels = [l['name'] for l in content.get('labels', {}).get('nodes', [])]
    status = next(
        (fv['name'] for fv in item['fieldValues']['nodes']
         if fv.get('field', {}).get('name') == 'Status'),
        'No Status'
    )
    priority = next(
        (fv['name'] for fv in item['fieldValues']['nodes']
         if fv.get('field', {}).get('name') == 'Priority'),
        None
    )
    assignees = [
        {'login': a['login'], 'avatarUrl': a['avatarUrl']}
        for a in content.get('assignees', {}).get('nodes', [])
    ]
    tickets.append({
        'number': content['number'],
        'title': content['title'],
        'url': content['url'],
        'repo': content['repository']['name'],
        'labels': labels,
        'assignees': assignees,
        'status': status,
        'priority': priority,
    })

if not tickets:
    print("fetch-data: 0 tickets after filtering — refusing to overwrite data", file=sys.stderr)
    sys.exit(1)

result = {'tickets': tickets, 'updatedAt': datetime.datetime.utcnow().isoformat() + 'Z'}
print(json.dumps(result))
