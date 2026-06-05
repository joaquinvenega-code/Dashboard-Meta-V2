import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/repos/nachios/ArgentinaProvincias/git/trees/master?recursive=1',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      console.log(JSON.parse(data).tree.map((i: any) => i.path));
    } catch(e) { console.log(data) }
  });
});
