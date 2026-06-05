import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/search/repositories?q=argentina+geojson',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(JSON.parse(data).items.map((i: any) => i.full_name)));
});
