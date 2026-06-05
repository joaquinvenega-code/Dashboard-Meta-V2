import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

const ba = data.features[0];
console.log(ba.properties.name);
console.log(JSON.stringify(ba.geometry.coordinates[0].slice(0, 5)));
