import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/mgaitan/departamentos_argentina/master/departamentos-tierra_del_fuego.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const geojson = JSON.parse(data);
    const malvinas = geojson.features.find((f: any) => f.properties.departamento === 'ISLAS MALVINAS');
    const existing = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

    // Remove the bad Malvinas
    existing.features = existing.features.filter((f: any) => f.id !== 'AR-V-MALVINAS');

    // Add this new Malvinas
    malvinas.id = 'AR-V-MALVINAS';
    malvinas.properties = {
       name: "Islas Malvinas",
       country: "ARG"
    };

    existing.features.push(malvinas);
    fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(existing, null, 2));
    console.log('Successfully updated Malvinas from departamentos_argentina');
  });
});
