import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/repos/alvarezgarcia/provincias-argentinas-geojson/git/trees/master?recursive=1',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).tree.map(t=>t.path)));
});
