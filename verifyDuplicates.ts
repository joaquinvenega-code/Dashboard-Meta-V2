import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

console.log(data.features.map((f: any) => `${f.properties.name} - ${f.id}`));
