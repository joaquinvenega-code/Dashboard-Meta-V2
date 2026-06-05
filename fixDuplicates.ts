import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

data.features = data.features.filter((f: any) => f.id !== 'AR-X' || f.properties.name === 'Cordoba');

fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(data, null, 2));
console.log('Fixed duplications.');
