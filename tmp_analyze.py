import json
with open('collection.json', 'r', encoding='utf-8-sig') as f:
    data = json.load(f)
print('Variables:', len(data['variable']))
print('Folders:')
for item in data['item']:
    print(f"  - {item['name']} ({len(item.get('item', []))} requests)")
print('\nEndpoints:')
for folder in data['item']:
    for req in folder.get('item', []):
        r = req.get('request', {})
        url = r.get('url', {})
        raw = url.get('raw') if isinstance(url, dict) else url
        print(f"  {folder['name']} | {r.get('method', '?')} {raw}")
