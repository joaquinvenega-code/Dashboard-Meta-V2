import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const OUTPUT_DIR = path.join(process.cwd(), 'src', 'assets', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'world_countries.json');

// Ensure output directories exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchGeoJSON(): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(URL, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch: ${res.statusCode} ${res.statusMessage}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
}

async function run() {
  console.log('Fetching world map boundaries from Natural Earth...');
  try {
    const rawData = await fetchGeoJSON();
    console.log('Parsing raw GeoJSON...');
    const geojson = JSON.parse(rawData);

    console.log('Simplifying and filtering features...');
    const simplifiedFeatures = geojson.features.map((feature: any) => {
      const props = feature.properties || {};
      
      // Get ISO_A3 code
      let iso_a3 = props.ISO_A3 || props.ADM0_A3 || '';
      if (iso_a3 === '-99' || !iso_a3) {
        iso_a3 = props.SOV_A3 || props.GU_A3 || '';
      }
      
      // Fix missing/corrupted codes for major countries if any
      if (props.NAME === 'France' && iso_a3 !== 'FRA') iso_a3 = 'FRA';
      if (props.NAME === 'Norway' && iso_a3 !== 'NOR') iso_a3 = 'NOR';
      if (props.NAME === 'Somaliland' && iso_a3 !== 'SOL') iso_a3 = 'SOM';
      
      const name = props.NAME || props.NAME_LONG || '';

      return {
        type: 'Feature',
        id: iso_a3,
        properties: {
          name: name,
          iso_a3: iso_a3
        },
        geometry: feature.geometry
      };
    }).filter((f: any) => f.id && f.id !== '-99');

    const resultGeoJSON = {
      type: 'FeatureCollection',
      features: simplifiedFeatures
    };

    const finalJSON = JSON.stringify(resultGeoJSON);
    console.log(`Writing simplified GeoJSON (${(finalJSON.length / 1024).toFixed(2)} KB) to ${OUTPUT_FILE}...`);
    
    fs.writeFileSync(OUTPUT_FILE, finalJSON, 'utf-8');
    console.log('Successfully generated simplified world map data!');
  } catch (error) {
    console.error('Error generating map dataset:', error);
    process.exit(1);
  }
}

run();
