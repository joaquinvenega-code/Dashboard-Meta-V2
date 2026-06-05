import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/search/code?q=argentina+filename:provincias.geojson',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
