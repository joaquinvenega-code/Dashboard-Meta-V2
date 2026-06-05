import https from 'https';

const getGeo = (url: string) => {
  https.get(url, (res) => {
    console.log(url, res.statusCode);
  });
};
getGeo('https://raw.githubusercontent.com/isaicm/GeoJSON-Argentina/main/provincias.geojson');
getGeo('https://raw.githubusercontent.com/mgaitan/departamentos_argentina/main/provincias.geojson');
getGeo('https://raw.githubusercontent.com/juanasis/Argentina-GeoJson/master/argentina - provincias.json');
