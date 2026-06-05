import https from 'https';

https.get('https://raw.githubusercontent.com/alvarezgarcia/provincias-argentinas-geojson/master/BUENOSAIRES.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 100)));
});
