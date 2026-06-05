import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

console.log(data.features.map((f: any) => {
   const length = f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates[0][0].length : f.geometry.coordinates[0].length;
   return f.properties.name + ' coords: ' + length;
}).join('\n'));
