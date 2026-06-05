import https from 'https';

https.get('https://raw.githubusercontent.com/pablocerchia/eleccionesargentina/main/geojson/provincias.geojson', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 100)));
});
