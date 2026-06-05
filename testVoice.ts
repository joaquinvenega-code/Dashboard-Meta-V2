import { parseAdvancedVoiceCommand, AvailableClient } from './src/utils/voiceParser.js';

const clients = [{ id: '1', name: 'Lucky baby' }];
const raw = "quiero que Ares una bitácora para el cliente Lucky baby para el día 22 de abril lo siguiente se bajó el presupuesto para que los anuncios lleguen activos al martes próximo por pedido del cliente";

const res = parseAdvancedVoiceCommand(raw, clients);
console.log("DATE:", res.date);
console.log("NOTE:", res.noteText);
