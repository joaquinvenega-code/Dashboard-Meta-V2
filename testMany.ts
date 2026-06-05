import https from 'https';

const getGeo = (url) => {
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(url, res.statusCode, data.substring(0, 50)));
  });
};

getGeo('https://raw.githubusercontent.com/wrobstory/vincent/master/examples/data/provincias.geo.json');
getGeo('https://raw.githubusercontent.com/deldersveld/topojson/master/countries/argentina/argentina-provinces.json'); // topojson
getGeo('https://raw.githubusercontent.com/jazzido/poligonos-argentina/master/provincias.geojson');
getGeo('https://raw.githubusercontent.com/mgaitan/departamentos_argentina/master/provincias.json');
