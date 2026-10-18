import json,sys
d=json.load(open(sys.argv[1]))
for r in d['report']:
    print(r['tag'],'gauge',r.get('gaugeScrub'),'| ink',r.get('inkScrub'),'| band',r.get('bandScrub'),'| embers',r.get('noseEmbers'),'| overflowX',r.get('overflowX'))
print('errors',d['errors'])
