import https from 'https';
import fs from 'fs';

const idMap: Record<string, string> = {
  "Buenos Aires": "AR-B", "Catamarca": "AR-K", "Chaco": "AR-H", "Chubut": "AR-U", 
  "Cordoba": "AR-X", "Corrientes": "AR-W", "Entre Rios": "AR-E", "Formosa": "AR-P", 
  "Jujuy": "AR-Y", "La Pampa": "AR-L", "La Rioja": "AR-F", "Mendoza": "AR-M", 
  "Misiones": "AR-N", "Neuquen": "AR-Q", "Rio Negro": "AR-R", "Salta": "AR-A", 
  "San Juan": "AR-J", "San Luis": "AR-D", "Santa Cruz": "AR-Z", "Santa Fe": "AR-S", 
  "Santiago del Estero": "AR-G", "Tierra del Fuego": "AR-V", "Tucuman": "AR-T", "CABA": "AR-C"
};

const normalize = (val: string) => val.normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const files = [
  'BUENOSAIRES.json', 'CATAMARCA.json', 'CHACO.json', 'CHUBUT.json', 'CORDOBA.json',
  'CORRIENTES.json', 'ENTRERIOS.json', 'FORMOSA.json', 'JUJUY.json', 'LAPAMPA.json',
  'LARIOJA.json', 'MENDOZA.json', 'MISIONES.json', 'NEUQUEN.json', 'RIONEGRO.json',
  'SALTA.json', 'SANJUAN.json', 'SANLUIS.json', 'SANTACRUZ.json', 'SANTAFE.json',
  'SANTIAGODELESTERO.json', 'TIERRADELFUEGO.json', 'TUCUMAN.json'
];

let allFeatures: any[] = [];

async function fetchFile(file: string) {
  return new Promise<void>((resolve, reject) => {
    https.get({
      hostname: 'api.github.com',
      path: `/repos/alvarezgarcia/provincias-argentinas-geojson/contents/${file}`,
      headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3.raw' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const geo = JSON.parse(data);
          if (geo.features) {
            geo.features.forEach((f: any) => {
              const name = f.properties.name || file;
              const normName = normalize(name);
              let id = "AR-X";
              for (const [k, v] of Object.entries(idMap)) {
                if (normalize(k) === normName || normalize(k) === normalize(file.replace('.json', ''))) {
                  id = v;
                  break;
                }
              }
              if(name) {
                  allFeatures.push({
                    type: "Feature",
                    id: id,
                    properties: { name: name.replace('.json', ''), country: "ARG" },
                    geometry: f.geometry
                  });
              }
            });
          }
        } catch(e) {
          console.error('Error parsing', file);
        }
        resolve();
      });
    }).on('error', reject);
  });
}

async function run() {
  for (const file of files) {
    await fetchFile(file);
  }
  
  // also fetch malvinas
  await new Promise<void>((resolve, reject) => {
    https.get('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/FLK.geo.json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const geojson = JSON.parse(data);
        const malvinasFeatures = geojson.features.map((f: any) => ({
          type: "Feature",
          id: "AR-V-MALVINAS",
          properties: { name: "Islas Malvinas", country: "ARG" },
          geometry: f.geometry
        }));
        
        allFeatures.push(...malvinasFeatures);
        
        const finalGeojson = { type: "FeatureCollection", features: allFeatures };
        fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(finalGeojson, null, 2));
        console.log('Successfully wrote combined regions_ARG.json with Malvinas!');
        resolve();
      });
    }).on('error', reject);
  });
}

run();
