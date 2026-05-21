import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const ADMIN0_110M_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const ADMIN1_50M_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces_lakes.geojson';

const OUTPUT_DIR = path.join(process.cwd(), 'src', 'assets', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'unified_world_regions.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchURL(url: string, timeoutMs = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let chunks: Buffer[] = [];
      res.on('data', (chk) => chunks.push(chk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
    });
    
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

const REGIONAL_COUNTRIES = new Set(['USA', 'ARG', 'BRA', 'ESP']);

const COUNTRY_NAME_MAP: Record<string, string> = {
  'USA': 'Estados Unidos',
  'ARG': 'Argentina',
  'ESP': 'España',
  'BRA': 'Brasil'
};

async function run() {
  try {
    console.log('Downloading 110m Admin-0 (World Countries)...');
    const admin0Raw = await fetchURL(ADMIN0_110M_URL);
    const admin0 = JSON.parse(admin0Raw);
    console.log(`Loaded ${admin0.features.length} country features successfully.`);

    console.log('Downloading 50m Admin-1 (States and Provinces - might be large, downloading chunked)...');
    const admin1Raw = await fetchURL(ADMIN1_50M_URL, 120000); // 120s timeout
    console.log('Done downloading 50m Admin-1. Parsing GeoJSON...');
    const admin1 = JSON.parse(admin1Raw);
    console.log(`Loaded ${admin1.features.length} state/province features from 50m database.`);

    const finalFeatures: any[] = [];

    // 1. Process all countries
    admin0.features.forEach((feature: any) => {
      const props = feature.properties || {};
      let iso_a3 = props.ISO_A3 || props.ADM0_A3 || '';
      if (iso_a3 === '-99' || !iso_a3) {
        iso_a3 = props.SOV_A3 || props.GU_A3 || '';
      }
      if (props.NAME === 'France' && iso_a3 !== 'FRA') iso_a3 = 'FRA';
      if (props.NAME === 'Norway' && iso_a3 !== 'NOR') iso_a3 = 'NOR';
      
      const iso3 = iso_a3.toUpperCase();

      if (REGIONAL_COUNTRIES.has(iso3)) {
        console.log(`Replacing main country block for ${props.NAME || iso3} with high-res 50m subregions.`);
      } else {
        // Keep the country block as a whole
        finalFeatures.push({
          type: 'Feature',
          id: iso3,
          properties: {
            name: props.NAME || props.NAME_LONG || '',
            type: 'country',
            iso_a3: iso3
          },
          geometry: feature.geometry
        });
      }
    });

    // 2. Extract and simplify properties for the subregions of USA, ARG, BRA, ESP
    let processedSubregionsCount = 0;
    admin1.features.forEach((feature: any) => {
      const props = feature.properties || {};
      const parentCountryA3 = (props.adm0_a3 || props.iso_a2 || '').toUpperCase();
      
      let countryCode = '';
      if (parentCountryA3 === 'USA' || props.iso_3166_2?.startsWith('US-')) {
        countryCode = 'USA';
      } else if (parentCountryA3 === 'ARG' || props.iso_3166_2?.startsWith('AR-')) {
        countryCode = 'ARG';
      } else if (parentCountryA3 === 'BRA' || props.iso_3166_2?.startsWith('BR-')) {
        countryCode = 'BRA';
      } else if (parentCountryA3 === 'ESP' || props.iso_3166_2?.startsWith('ES-')) {
        countryCode = 'ESP';
      }

      if (countryCode) {
        // Clean and map region ID, e.g. "US-CA", "AR-B"
        let regionId = props.iso_3166_2 || '';
        if (!regionId && props.postal) {
          regionId = `${countryCode.substring(0, 2)}-${props.postal}`;
        }
        
        if (regionId) {
          regionId = regionId.toUpperCase();
          finalFeatures.push({
            type: 'Feature',
            id: regionId,
            properties: {
              name: props.name || '',
              country: countryCode,
              type: 'region',
              parentCountryName: COUNTRY_NAME_MAP[countryCode] || countryCode
            },
            geometry: feature.geometry
          });
          processedSubregionsCount++;
        }
      }
    });

    console.log(`Merged ${processedSubregionsCount} subregion features successfully.`);

    const unifiedResult = {
      type: 'FeatureCollection',
      features: finalFeatures
    };

    const finalJSON = JSON.stringify(unifiedResult);
    console.log(`Writing unified high-quality map GeoJSON (${(finalJSON.length / 1024).toFixed(2)} KB) to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, finalJSON, 'utf-8');
    console.log('Successfully completed unifed world map generation!');
  } catch (err) {
    console.error('Error generating unified world map:', err);
    process.exit(1);
  }
}

run();
