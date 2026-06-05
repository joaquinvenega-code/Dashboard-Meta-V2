import https from 'https';
import fs from 'fs';

const fetchFile = (repo: string, file: string) => {
  https.get({
    hostname: 'api.github.com',
    path: `/repos/${repo}/contents/${encodeURIComponent(file)}`,
    headers: { 'User-Agent': 'Node.js', 'Accept': 'application/vnd.github.v3.raw' }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(repo, res.statusCode, data.substring(0, 100).replace(/\n/g, ' ')));
  });
};

fetchFile('mgaitan/departamentos_argentina', 'provincias.json');
fetchFile('alvarezgarcia/provincias-argentinas-geojson', 'BUENOSAIRES.json');
fetchFile('matischroder/argentinaJson', 'argentina.json');
fetchFile('juanasis/Argentina-GeoJson', 'provincias.json');
fetchFile('pablocerchia/eleccionesargentina', 'geojson/provincias.geojson');
