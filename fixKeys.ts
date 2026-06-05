import fs from 'fs';

const argData = JSON.parse(fs.readFileSync('src/assets/data/regions_ARG.json', 'utf8'));

// Change the ISO id of Malvinas
const malvinas = argData.features.filter((f: any) => f.properties.name === "Islas Malvinas");
malvinas.forEach((f: any, i: number) => {
    f.id = `AR-V-MALVINAS-${i}`; // ensure completely unique
});

fs.writeFileSync('src/assets/data/regions_ARG.json', JSON.stringify(argData, null, 2));
console.log('Fixed keys');
