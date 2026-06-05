import { parseAdvancedVoiceCommand, AvailableClient } from './src/utils/voiceParser.js';

const clients = [{ id: '1', name: 'Lucky baby' }, { id: '2', name: 'Inmobiliaria Cuyo' }];
const tests = [
  "anotar la siguiente bitácora para el cliente Lucky baby el día 22 de abril se redujo el presupuesto para que se mantuvieran activos los anuncios hasta el martes próximo con el presupuesto actual",
  "Anotar en la bitácora de Inmobiliaria Cuyo con fecha 16 de mayo nos conectamos con Alejandro",
  "Anotar en la bitácora de Inmobiliaria Cuyo el 14 se subió el presupuesto",
  "Agregar nota para Lucky baby ayer bajamos el presupuesto",
  "Anotar bitácora para cliente Inmobiliaria Cuyo el día de hoy tuvimos una reunión técnica",
  "el día veintidós de abril"
];

for(const t of tests) {
  const res = parseAdvancedVoiceCommand(t, clients);
  console.log(`\nTEXT: ${t}\nDATE: ${res.date}\nNOTE: ${res.noteText}`);
}
