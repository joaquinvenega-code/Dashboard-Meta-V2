import https from 'https';

https.get({
  hostname: 'api.github.com',
  path: '/repos/pablocerchia/eleccionesargentina/git/trees/main?recursive=1',
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
