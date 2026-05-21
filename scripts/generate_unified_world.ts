import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const ADMIN0_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';
const ADMIN1_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_1_states_provinces_lakes.geojson';

const OUTPUT_DIR = path.join(process.cwd(), 'src', 'assets', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'unified_world_regions.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function fetchURL(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode}`));
        return;
      }
      let chunks: Buffer[] = [];
      res.on('data', (chk) => chunks.push(chk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf-8'));
      });
    }).on('error', reject);
  });
}

// Countries where we want regional detail (Alpha-3 as specified by Natural Earth properties)
const REGIONAL_COUNTRIES = new Set(['USA', 'ARG', 'BRA', 'ESP']);

async function run() {
  try {
    console.log('Downloading Admin-0 (World Countries)...');
    const admin0Raw = await fetchURL(ADMIN0_URL);
    const admin0 = JSON.parse(admin0Raw);
    console.log(`Loaded ${admin0.features.length} country features.`);

    console.log('Downloading Admin-1 (States and Provinces)...');
    const admin1Raw = await fetchURL(ADMIN1_URL);
    const admin1 = JSON.parse(admin1Raw);
    console.log(`Loaded ${admin1.features.length} state/province features.`);

    // Analyze properties on first 5 admin-1 features to understand keys
    console.log('Sample properties of Admin-1:');
    for (let i = 0; i < 5; i++) {
      const f = admin1.features[i];
      if (f) {
        console.log(`Feature ${i}:`, {
          name: f.properties?.name,
          iso_3166_2: f.properties?.iso_3166_2,
          iso_a2: f.properties?.iso_a2,
          adm0_a3: f.properties?.adm0_a3,
          postal: f.properties?.postal
        });
      }
    }

    // Now let's assemble the unified world regions:
    // We want all countries, EXCEPT for the countries in REGIONAL_COUNTRIES.
    // For countries in REGIONAL_COUNTRIES, we want to export their subregions instead.
    
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
        // Skip drawing the main country block. We will replace it with its admin1 pieces.
        console.log(`Skipping main country block for ${props.NAME || iso3} because it will be rendered as subregions.`);
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

    // 2. Add the subregions for USA, ARG, BRA, ESP
    admin1.features.forEach((feature: any) => {
      const props = feature.properties || {};
      const parentCountryA3 = (props.adm0_a3 || props.iso_a2 || '').toUpperCase();
      
      // Some properties mapping to assure we match USA, ARG, BRA, ESP
      let countryMatch = '';
      if (parentCountryA3 === 'USA' || props.iso_3166_2?.startsWith('US-')) {
        countryMatch = 'USA';
      } else if (parentCountryA3 === 'ARG' || props.iso_3166_2?.startsWith('AR-')) {
        countryMatch = 'ARG';
      } else if (parentCountryA3 === 'BRA' || props.iso_3166_2?.startsWith('BR-')) {
        countryMatch = 'BRA';
      } else if (parentCountryA3 === 'ESP' || props.iso_3166_2?.startsWith('ES-')) {
        countryMatch = 'ESP';
      }

      if (countryMatch) {
        let regionId = props.iso_3166_2 || '';
        
        // Let's normalize region IDs if missing or structured differently
        if (!regionId && props.postal) {
          regionId = `${countryMatch.substring(0, 2)}-${props.postal}`;
        }
        
        if (regionId) {
          finalFeatures.push({
            type: 'Feature',
            id: regionId.toUpperCase(),
            properties: {
              name: props.name || '',
              country: countryMatch,
              type: 'region',
              parentCountryName: COUNTRY_NAME_MAP[countryMatch] || countryMatch
            },
            geometry: feature.geometry
          });
        }
      }
    });

    const unifiedResult = {
      type: 'FeatureCollection',
      features: finalFeatures
    };

    console.log(`Unified world map contains ${finalFeatures.length} features.`);
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(unifiedResult), 'utf-8');
    console.log(`Successfully wrote unified map data to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Error generating unified world map:', err);
    process.exit(1);
  }
}

const COUNTRY_NAME_MAP: Record<string, string> = {
  'USA': 'Estados Unidos',
  'ARG': 'Argentina',
  'ESP': 'España',
  'BRA': 'Brasil'
};

run();
