import fs from 'fs';
const data = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

for (let feat of data.features.slice(0,3)) {
  const c = feat.geometry.coordinates[0];
  let minx=Infinity, maxx=-Infinity, miny=Infinity, maxy=-Infinity;
  c.forEach((pt: any) => {
    if(pt[0]<minx) minx=pt[0];
    if(pt[0]>maxx) maxx=pt[0];
    if(pt[1]<miny) miny=pt[1];
    if(pt[1]>maxy) maxy=pt[1];
  });
  console.log(feat.properties.name, `minx:${minx} maxx:${maxx} miny:${miny} maxy:${maxy} isRect:${c.length <= 5}`);
}
