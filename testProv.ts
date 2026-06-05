import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/mgaitan/departamentos_argentina/master/provincias.geojson', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('/tmp/provincias.geojson', data);
    console.log(data.substring(0, 50));
  });
});
