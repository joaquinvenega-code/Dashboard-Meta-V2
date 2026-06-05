import https from 'https';
const getGeo = (url: string) => {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  });
};
getGeo('https://raw.githubusercontent.com/geoinquietos-cordoba/datos-abiertos/master/geografia/provincias.geojson');
getGeo('https://raw.githubusercontent.com/isaicm/GeoJSON-Argentina/master/provincias.geojson');
getGeo('https://raw.githubusercontent.com/paliita/argentina-geojson/master/argentina.geojson');
getGeo('https://raw.githubusercontent.com/deldersveld/topojson/master/countries/argentina/argentina-provinces.json');
