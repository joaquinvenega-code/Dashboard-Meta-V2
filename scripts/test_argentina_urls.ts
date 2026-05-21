import * as https from 'https';

const URLS = [
  'https://raw.githubusercontent.com/bengrosser/argentina-geojson/master/argentina.geojson',
  'https://raw.githubusercontent.com/estadistica/argentina-geojson/master/provincias.geojson',
  'https://raw.githubusercontent.com/estadistica/argentina-geojson/master/provincia.geojson',
  'https://raw.githubusercontent.com/geoportalar/provincias/master/provincias.geojson',
  'https://raw.githubusercontent.com/geocomunidad-ar/geodat-geojson/master/provincias.geojson'
];

async function checkUrl(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    https.request(url, { method: 'HEAD' }, (res) => {
      console.log(`URL: ${url} -> Status: ${res.statusCode}`);
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false)).end();
  });
}

async function run() {
  for (const url of URLS) {
    const ok = await checkUrl(url);
    if (ok) {
      console.log('FOUND ACTIVE URL:', url);
    }
  }
}
run();
