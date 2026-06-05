import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

for (let feat of data.features.slice(20,24)) {
  console.log(feat.properties.name, feat.id, 'coords count', feat.geometry.coordinates[0].length || feat.geometry.coordinates[0][0].length);
}
