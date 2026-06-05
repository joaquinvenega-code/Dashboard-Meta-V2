import fs from 'fs';

const idMap: Record<string, string> = {
  "Buenos Aires": "AR-B",
  "Capital Federal": "AR-C",
  "Catamarca": "AR-K",
  "Chaco": "AR-H",
  "Chubut": "AR-U",
  "Cordoba": "AR-X",
  "Corrientes": "AR-W",
  "Entre Rios": "AR-E",
  "Formosa": "AR-P",
  "Jujuy": "AR-Y",
  "La Pampa": "AR-L",
  "La Rioja": "AR-F",
  "Mendoza": "AR-M",
  "Misiones": "AR-N",
  "Neuquen": "AR-Q",
  "Rio Negro": "AR-R",
  "Salta": "AR-A",
  "San Juan": "AR-J",
  "San Luis": "AR-D",
  "Santa Cruz": "AR-Z",
  "Santa Fe": "AR-S",
  "Santiago del Estero": "AR-G",
  "Tierra del Fuego": "AR-V",
  "Tucuman": "AR-T"
};

const normalize = (val: string) => {
  return val.normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();
};

const geojson = JSON.parse(fs.readFileSync('./argentina.json', 'utf8'));

const mappedFeatures = geojson.features.map((f: any) => {
  const normName = normalize(f.properties.name);
  let id = "AR-X"; // Default maybe Cordoba just in case but we'll find match
  for (const [k, v] of Object.entries(idMap)) {
    if (normalize(k).toLowerCase() === normName.toLowerCase()) {
      id = v;
      break;
    }
  }

  return {
    type: "Feature",
    id: id,
    properties: {
      name: f.properties.name,
      country: "ARG"
    },
    geometry: f.geometry
  };
});

const finalGeojson = {
  type: "FeatureCollection",
  features: mappedFeatures
};

fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(finalGeojson, null, 2));
console.log('Successfully wrote new regions_ARG.json');
