import https from 'https';
import fs from 'fs';

https.get('https://raw.githubusercontent.com/johan/world.geo.json/master/countries/FLK.geo.json', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const geojson = JSON.parse(data);
    
    const argData = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));
    
    // Check if Malvinas is already there
    const existing = argData.features.find((f: any) => f.id === 'AR-V-MALVINAS' || f.properties.name === 'Islas Malvinas');
    if (existing) {
        console.log('Malvinas is already there');
        return;
    }

    const malvinasFeatures = geojson.features.map((f: any) => ({
      type: "Feature",
      id: "AR-V", // Assigning AR-V so it acts as Tierra del Fuego in terms of ID, wait, let's keep it AR-V-MALVINAS.
      properties: {
        name: "Islas Malvinas",
        country: "ARG"
      },
      geometry: f.geometry
    }));

    // Actually, setting id to "AR-V" so that sales in AR-V map to Malvinas too? 
    // Or we let it be its own region, name: "Islas Malvinas". The GlobalSalesMap checks normalize(feature.properties.name) to get sales. If it's AR-V, it will get the Region's sales if id is AR-V.
    // So let's make id: "AR-V" so it gets colored based on Tierra del Fuego.
    malvinasFeatures.forEach((f: any) => f.id = "AR-V");

    argData.features.push(...malvinasFeatures);
    
    fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(argData, null, 2));
    console.log('Successfully added Malvinas as AR-V');
  });
});
