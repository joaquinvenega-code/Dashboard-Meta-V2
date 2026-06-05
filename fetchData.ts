import https from 'https';
import fs from 'fs';

https.get('https://code.highcharts.com/mapdata/countries/ar/ar-all.geo.json', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    const geojson = JSON.parse(data);
    
    // Map Highcharts features format to match our expected format.
    // Highcharts uses features[i].properties["hc-key"] for regions, let's map them.
    const features = geojson.features.map(f => {
      // "name" could be f.properties.name
      // "country": "ARG"
      return {
        type: "Feature",
        id: f.properties["hc-key"] ? `AR-${f.properties["hc-key"].split("-")[1].toUpperCase()}` : "AR-X",
        properties: {
          name: f.properties.name,
          country: "ARG"
        },
        geometry: f.geometry
      };
    });
    
    const mapped = {
      type: "FeatureCollection",
      features: features
    };
    
    fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(mapped, null, 2));
    console.log('Successfully wrote new regions_ARG.json');
  });
}).on('error', (err) => {
  console.log('Error: ' + err.message);
});
