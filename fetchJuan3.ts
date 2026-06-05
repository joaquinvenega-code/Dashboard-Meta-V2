import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/juanasis/Argentina-GeoJson/master/argentina.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('./argentina.json', data);
    console.log(data.substring(0, 200));
  });
});
