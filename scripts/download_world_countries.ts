import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const OUTPUT_PATH = path.join(process.cwd(), 'src', 'assets', 'data', 'world_countries.json');

const dir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed with status: ${res.statusCode}`));
        return;
      }
      let buffer = '';
      res.on('data', (chk) => { buffer += chk; });
      res.on('end', () => resolve(buffer));
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Downloading 110m Admin-0 world countries...');
    const raw = await fetch(URL);
    const geo = JSON.parse(raw);
    console.log(`Successfully fetched. Total countries: ${geo.features.length}`);

    const features = geo.features.map((f: any) => {
      const props = f.properties || {};
      let iso_a3 = props.ISO_A3 || props.ADM0_A3 || '';
      if (iso_a3 === '-99' || !iso_a3) {
        iso_a3 = props.SOV_A3 || props.GU_A3 || '';
      }
      if (props.NAME === 'France' && iso_a3 !== 'FRA') iso_a3 = 'FRA';
      if (props.NAME === 'Norway' && iso_a3 !== 'NOR') iso_a3 = 'NOR';
      
      const iso3 = iso_a3.toUpperCase();

      return {
        type: 'Feature',
        id: iso3,
        properties: {
          name: props.NAME || props.NAME_LONG || '',
          formal_name: props.FORMAL_EN || ''
        },
        geometry: f.geometry
      };
    });

    const output = {
      type: 'FeatureCollection',
      features
    };

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output), 'utf8');
    console.log(`Saved world countries to: ${OUTPUT_PATH}`);
  } catch (err: any) {
    console.error('Error:', err.message);
  }
}

run();
