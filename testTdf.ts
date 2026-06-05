import https from 'https';
https.get({
    hostname: 'api.github.com',
    path: `/repos/alvarezgarcia/provincias-argentinas-geojson/contents/TIERRADELFUEGO.json`,
    headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3.raw' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
       try { JSON.parse(data); console.log('success'); }
       catch(e:any) { console.log(e.message); }
    });
  });
