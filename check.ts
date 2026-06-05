import https from 'https';

https.get('https://raw.githubusercontent.com/martineq/GeoJSON-Argentina/master/provincias.geojson', (res) => { // well that repository was 404 earlier.
    console.log(res.statusCode);
});
