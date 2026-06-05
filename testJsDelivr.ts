import https from 'https';
import fs from 'fs';

https.get('https://cdn.jsdelivr.net/gh/deldersveld/topojson@master/countries/argentina/argentina-provinces.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data.substring(0, 100)));
});
