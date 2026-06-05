import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/search/repositories?q=argentina+geojson+provincias',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
