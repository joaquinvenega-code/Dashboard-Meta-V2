// Local, deterministic print QA. No account credentials or live Meta requests.
// Run after npm run build: npx tsx scripts/render-report-fixture.tsx [messaging|ecommerce|leads|leads-zero|leads-long|empty|long|compact|single|many]
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import { MonthlyReportDocument, MonthlyReportDocumentProps } from '../src/components/reports/MonthlyReportDocument';
import regionsARG from '../src/assets/data/regions_ARG.json';
import regionsPER from '../src/assets/data/regions_PER.json';
import { adTrafficMetrics } from '../src/lib/adTraffic';
const variant = process.argv[2] || 'messaging';
if (!['messaging', 'ecommerce', 'leads', 'leads-zero', 'leads-long', 'empty', 'long', 'compact', 'single', 'many'].includes(variant)) throw new Error('Unknown fixture');
const messaging = variant !== 'ecommerce';
const dailyMessages = [1,3,2,5,2,3,0,0,1,1,1,1,1,4,2,1,3,5,2,1,3,2,2,1,2,3,1,2,0,1,2];
const dailySpend = [15000,29000,24000,24500,17000,15500,12000,9000,16000,11000,20000,19500,18500,14500,13000,22000,18000,19500,18500,21000,29000,23500,28500,21500,33500,28000,24000,22500,18500,27500,17234];
const spend = dailySpend.reduce((sum, value) => sum + value, 0);
const messages = dailyMessages.reduce((sum, value) => sum + value, 0);
const fixtureImages = fs.existsSync('tmp/pdfs/editorial/images') ? fs.readdirSync('tmp/pdfs/editorial/images').filter(name => name.endsWith('.png')).slice(0,5).map(name => 'data:image/png;base64,' + fs.readFileSync(path.join('tmp/pdfs/editorial/images', name)).toString('base64')) : [];
const props: MonthlyReportDocumentProps = {
  name: 'Qontact · Muestra de diseño', month: '2026-08', mode: messaging ? 'messaging' : 'ecommerce', dataAvailable: variant !== 'empty',
  metrics: { spend, messages: 57, purchases: 58, revenue: spend * 3.5, roas: 3.5, costPerMessage: spend / messages, impressions: 70904, reach: 31782, clicks: 962, ctr: 1.36, atc: 380, currency: 'ARS' },
  daily: dailyMessages.map((value, index) => ({ date: String(index + 1).padStart(2, '0') + '/08', messages: value, purchases: value, spend: dailySpend[index], revenue: dailySpend[index] * 3.5 })),
  assets: ['Video · Qué es y ventajas del producto', 'Carrusel · Firma de recibos por WhatsApp', 'Carrusel · Sistemas de control de asistencia', 'Video · Qontact y Bejerman Sueldos', 'Video · Presentación de funcionalidades'].map((name, index) => ({ id: String(index), name: variant === 'long' ? name + ' · ' + 'Descripción extensa del anuncio para comprobar el ajuste de líneas. '.repeat(3) : name, thumbnail: fixtureImages[index] || '', spend: [200983,37300,32825,44641,798][index], messages: [24,6,6,3,0][index], purchases: [24,6,6,3,0][index], revenue: [800000,125000,110000,130000,0][index], roas: [3.98,3.35,3.35,2.91,0][index] })),
  demographics: [{ age:'25-34',male:8,female:9,rawValue:110000 },{ age:'35-44',male:13,female:15,rawValue:177000 },{ age:'45-54',male:12,female:15,rawValue:171000 },{ age:'55-64',male:6,female:6,rawValue:79000 },{ age:'65+',male:7.5,female:8.5,rawValue:94234 }],
  countries: [{ countryId:'AR',messages:51,purchases:51,revenue:0,spend:538037 },{ countryId:'PE',messages:11,purchases:11,revenue:0,spend:93197 }],
  regions: Array.from({length:18},(_,index)=>({ countryId:index === 1 ? 'PE' : 'AR',regionId:['AR-B','PE_Lima','AR-X','AR-S','AR-M','AR-C'][index] || 'AR_Sample'+index,regionName:['Buenos Aires · Argentina','Lima · Perú','Córdoba · Argentina','Santa Fe · Argentina','Mendoza · Argentina','Ciudad Autónoma de Buenos Aires · Argentina'][index] || 'Región de muestra ' + (index+1),messages:index === 0 ? 24 : index === 1 ? 11 : index === 2 ? 5 : index === 3 ? 4 : index === 4 ? 4 : 1,purchases:index === 0 ? 24 : 2,revenue:0,spend:Math.round(spend/18) })),
  placements: [{name:'Instagram Feed',value:49,rawValue:309304.66,color:'#2563eb'},{name:'Instagram Reels',value:34,rawValue:214619.56,color:'#2563eb'},{name:'Instagram Otros',value:15,rawValue:94685.1,color:'#2563eb'},{name:'Facebook Feed',value:2,rawValue:12624.68,color:'#2563eb'}], placementBasis:'spend',
  texts: variant === 'long' ? { narrative: 'Texto de prueba para verificar una conclusión extensa sin cortar contenido. '.repeat(16), learnings:'Aprendizaje documentado para el período. '.repeat(8), actionPlan:'Acción acordada para el siguiente período. '.repeat(8), clientRequests:'Material solicitado al cliente. '.repeat(8) } : { narrative:'', learnings:'Revisar la diferencia entre el total mensual y el desglose geográfico antes de interpretar resultados regionales.', actionPlan:'Comparar la calidad de los contactos por anuncio antes de decidir cambios de inversión.', clientRequests:'' },
  logs: variant === 'empty' ? [] : Array.from({length:variant === 'long' ? 19 : 7},(_,index)=>({id:String(index),date:String(index + 1).padStart(2,'0')+'/08',source:index % 2 ? 'Manual' : 'Voz',category:['observation','change','testing'][index%3],description:variant === 'long' ? ('Registro ' + (index+1) + '. Texto extenso para comprobar que la anotación se conserva íntegra sin recortes. ').repeat(4) : ['Se revisó la calidad de las conversaciones y se registraron las consultas más frecuentes.','Se ajustó la distribución del presupuesto entre campañas activas.','Se preparó una prueba de nuevos creativos para el público de remarketing.','Se revisaron las ubicaciones con menor volumen de consultas.','Se incorporaron los comentarios del cliente sobre la calidad de los contactos.','Se verificó el seguimiento de conversiones y las métricas del período.','Se documentaron los aprendizajes y las acciones propuestas para el siguiente mes.'][index]})),
  isEditing:false, onUpdate:()=>undefined,
};
props.assets = props.assets.map((ad,index) => ({...ad,traffic:adTrafficMetrics({spend:ad.spend,clicks:[356,89,74,0,2][index],impressions:variant === 'long' && index === 0 ? 12500000 : [24830,9812,7540,5310,119][index]})}));
// All subdivisions, including explicit zeroes, exercise boundary contrast.
const counts: Record<string, number> = {'AR-B':22,'AR-C':7,'AR-M':5,'AR-X':5,'AR-S':4,'AR-T':2,'AR-A':2,'AR-Y':1,'AR-U':1,'AR-H':1,'AR-Q':1,'PE-LIM':8,'PE-LMA':2,'PE-ARE':1};
props.regions = [...regionsARG.features, ...regionsPER.features, {id:'AR-C',properties:{name:'Ciudad Autónoma de Buenos Aires',country:'ARG'}}].map(feature => ({countryId:feature.properties.country === 'ARG' ? 'AR' : 'PE',regionId:feature.id,regionName:feature.properties.name,messages:counts[feature.id] || 0,purchases:counts[feature.id] || 0,revenue:0,spend:(counts[feature.id] || 0)*500}));
if (variant === 'compact') {
  props.texts = {};
  props.logs = props.logs.slice(0,3).map((log,index)=>({...log,description:log.description.repeat([1,3,2][index])}));
}
if (variant === 'single') { props.countries = props.countries.slice(0,1); props.logs=[]; props.texts={}; }
if (variant === 'many') { props.countries.push({countryId:'BR',messages:8,purchases:8,revenue:0,spend:100}, {countryId:'MX',messages:1,purchases:1,revenue:0,spend:10}); props.logs=[]; props.texts={}; }
if (variant.startsWith('leads')) {
  const zero = variant === 'leads-zero';
  const leadCounts: Record<string, number> = {'AR-B':19,'AR-X':6,'AR-M':5,'PE-LIM':9,'PE-ARE':4};
  const leads = zero ? 0 : 43;
  props.mode = 'leads';
  props.metrics = {...props.metrics, leads, costPerLead:leads ? spend / leads : 0};
  props.daily = props.daily.map((day,index)=>({...day,leads:zero ? 0 : index < 12 ? 2 : 1}));
  props.countries = props.countries.map(country=>({...country,leads:zero ? 0 : country.countryId === 'AR' ? 30 : 13}));
  props.regions = props.regions.map(region=>({...region,leads:zero ? 0 : leadCounts[region.regionId] || 0}));
  props.assets = props.assets.map((ad,index)=>({...ad,leads:zero ? 0 : [12,8,5,3,0][index],name:variant === 'leads-long' ? ad.name + ' · ' + 'Descripción extensa del anuncio para comprobar el ajuste de líneas. '.repeat(3) : ad.name}));
  props.placementBasis = zero ? 'spend' : 'leads';
  if (!zero) props.placements = props.placements.map((row,index)=>({...row,rawValue:[20,15,7,1][index],value:[20,15,7,1][index]/43*100}));
  props.texts = {learnings:'Comparar la calidad de los clientes potenciales por anuncio antes de decidir cambios de inversión.',actionPlan:'Revisar con el cliente cuántos leads avanzaron a una conversación comercial.'};
  props.logs = props.logs.map(log=>({...log,description:log.description.replace('conversaciones','clientes potenciales')}));
}
const css = fs.readdirSync('dist/assets').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join('dist/assets',name),'utf8')).join('\n');
const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Muestra de QA · Datos sintéticos</title><style>' + css + '</style></head><body><div id="root"><div class="min-h-screen flex"><aside class="print:hidden">App</aside><main class="p-10"><div class="mx-auto max-w-7xl space-y-10"><div class="print:hidden">Toolbar</div><div><div class="monthly-report-print-root space-y-6 pb-20"><div class="print:hidden">Exportar</div><div class="relative">' + renderToStaticMarkup(<MonthlyReportDocument {...props}/>) + '</div></div></div></div></main><div style="position:fixed;bottom:0">Asistente fuera del informe</div></div></div></body></html>';
fs.mkdirSync('tmp/pdfs/editorial',{recursive:true});
fs.writeFileSync('tmp/pdfs/editorial/' + variant + '.html',html);
console.log('Generated local fixture: ' + variant);
