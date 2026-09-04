import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { aggregateDemographics, aggregateGeography, aggregatePlacements, completeDailySeries, countryLabel, reportAction, reportPeriodMetrics, REPORT_MODES } from './reportData';
import { chartMaximum, PerformanceChartV2 } from './v2/PerformanceChartV2';
import { AssetPerformanceV2 } from './v2/AssetPerformanceV2';
import { GeographicSummary } from './GeographicSummary';
import { collectReportLogs } from './reportLogs';
import { ManagementTimelineV2 } from './v2/ManagementTimelineV2';
import { ReportActivityMap, activityColor, activityPalette, matchMapRegion, mapCountryId } from './ReportActivityMap';
import { ReportFunnelBoard } from './ReportFunnelBoard';
import { MonthlyReportDocument } from './MonthlyReportDocument';
import { AD_TRAFFIC_FIELDS, adTrafficMetrics } from '../../lib/adTraffic';
import { formatCurrency } from '../../lib/utils';
import { metaLeadCount } from '../../lib/metaLeads';
import { metaMessageCount } from '../../lib/metaMessages';
import { fetchAccountDailyPerformance, setFacebookAccessToken } from '../../services/facebook';
import { AD_SHARE_LINK_FIELD, fetchAdShareLink, safeMetaShareLink } from '../../lib/adShareLink';

test('explicit zero is not replaced by a different action metric', () => {
  assert.equal(reportAction([{ action_type: 'a', value: '0' }, { action_type: 'b', value: '8' }], 'a', 'b'), 0);
});

test('message aliases preserve zero and only fall back when the preferred event is absent', () => {
  const preferred = 'onsite_conversion.messaging_conversation_started_7d';
  const fallback = { action_type: 'onsite_conversion.total_messaging_connection', value: '8' };
  assert.equal(metaMessageCount([{ action_type: preferred, value: '0' }, fallback]), 0);
  assert.equal(metaMessageCount([fallback, { action_type: preferred, value: '3' }]), 3);
  assert.equal(metaMessageCount([fallback]), 8);
  assert.equal(metaMessageCount(), 0);
});

test('daily service and report breakdowns agree on messaging events with explicit zeros', async (t) => {
  const primary = (value: string) => ({ action_type: 'onsite_conversion.messaging_conversation_started_7d', value });
  const alternate = (value: string) => ({ action_type: 'onsite_conversion.total_messaging_connection', value });
  const rows = [
    { date_start: '2026-08-01', actions: [primary('0'), alternate('8')] },
    { date_start: '2026-08-02', actions: [primary('3'), alternate('9')] },
    { date_start: '2026-08-03', actions: [alternate('2')] },
  ].map(row => ({ ...row, country: 'AR', region: 'Buenos Aires', publisher_platform: 'facebook', platform_position: 'feed', spend: '10' }));
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { setTimeout, clearTimeout } });
  setFacebookAccessToken('test-only-token');
  t.after(() => {
    setFacebookAccessToken(null);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  });
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ data: rows }), { status: 200 }));
  const daily = await fetchAccountDailyPerformance('act_test', '2026-08-01', '2026-08-31');
  assert.deepEqual(daily.map(row => row.messages), [0, 3, 2]);
  const period = reportPeriodMetrics({ actions: [primary('5'), alternate('19')] }, daily, 'ARS');
  assert.equal(daily.reduce((sum, row) => sum + row.messages, 0), period.messages);
  assert.equal(reportPeriodMetrics(null, daily, 'ARS').messages, 5);
  assert.equal(aggregateGeography(rows).countries[0].messages, 5);
  assert.equal(aggregatePlacements(rows, 'messaging').data[0].rawValue, 5);
});
test('messaging placements use messages, retain tiny shares, and handle Stories', () => {
  const rows = [{ publisher_platform: 'instagram', platform_position: 'stories', spend: '1', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' }] }, { publisher_platform: 'facebook', platform_position: 'feed', spend: '999', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '999' }] }];
  const result = aggregatePlacements(rows, 'messaging');
  assert.equal(result.basis, 'messages'); assert.equal(result.data.length, 2);
  assert.equal(result.data[1].name, 'Instagram Stories'); assert.equal(result.data[1].value, 0.1);
});
test('missing placement results explicitly fall back to spend, never samples', () => {
  assert.deepEqual(aggregatePlacements([], 'messaging'), { basis: 'spend', data: [] });
  assert.equal(aggregatePlacements([{ spend: 40 }], 'messaging').basis, 'spend');
});
test('demographic bars use investment even when revenue is present', () => {
  const result = aggregateDemographics([{ age: '25-34', gender: 'female', spend: 20, action_values: [{ action_type: 'purchase', value: 9000 }] }, { age: '25-34', gender: 'unknown', spend: 10 }]);
  assert.equal(result[0].rawValue, 30); assert.ok(Math.abs((result[0].unknown || 0) - 100 / 3) < 1e-10);
  assert.deepEqual(aggregateDemographics([]), []);
});
test('period reach remains unique and is never inferred from impressions', () => {
  assert.equal(reportPeriodMetrics(null, [{ impressions: 1000 }], 'USD').reach, undefined);
  assert.equal(reportPeriodMetrics({ reach: 120, impressions: 500 }, [{ reach: 200 }, { reach: 200 }], 'USD').reach, 120);
});
test('missing daily values are null, real zeros are retained, leap February works', () => {
  const result = completeDailySeries([{ date: '2024-02-02', messages: 0, spend: 0 }], '2024-02');
  assert.equal(result.length, 29); assert.equal(result[0].messages, null); assert.equal(result[1].messages, 0);
  assert.deepEqual(completeDailySeries([], '2026-08'), []);
});
test('chart scales are finite for empty, zero, small and constant series', () => {
  for (const values of [[], [0, 0], [null], [0.03], [5, 5]]) assert.ok(chartMaximum(values) > 0);
});
test('zero-result creatives do not present a zero acquisition cost', () => {
  const html = renderToStaticMarkup(<AssetPerformanceV2 mode="messaging" currency="ARS" assets={[{ id: '0', name: 'Sin resultado', thumbnail: '', spend: 798, messages: 0, purchases: 0, revenue: 0, roas: 0 }]} />);
  assert.ok(html.includes('Sin resultados registrados')); assert.ok(html.includes('—')); assert.ok(!html.includes('$0'));
});
test('geographic mismatch is disclosed without normalizing source numbers', () => {
  const html = renderToStaticMarkup(<GeographicSummary countries={[{ countryId: 'PE', messages: 62, purchases: 0, revenue: 0, spend: 10 }]} regions={[]} expectedResults={58} currency="ARS" mode="messaging" />);
  assert.ok(html.includes('62')); assert.ok(html.includes('58')); assert.ok(html.includes('Diferencia a revisar')); assert.equal(countryLabel('PE'), 'Perú');
});

test('geography excludes empty countries and their regions from the entire report', () => {
  const data = aggregateGeography([
    { country: 'AR', region: 'Buenos Aires', spend: '100', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '5' }] },
    { country: 'AR', region: 'Salta', spend: '0', actions: [] },
    { country: 'PY', region: 'Buenos Aires', spend: '0', actions: [] },
  ]);
  assert.deepEqual(data.countries.map(country => country.countryId), ['AR']);
  assert.equal(data.regions.length, 2);
  const html = renderToStaticMarkup(<GeographicSummary {...data} expectedResults={5} currency="ARS" mode="messaging" />);
  assert.ok(html.includes('1 país y 2 regiones'));
  assert.ok(html.includes('Mapa regional de Argentina'));
  assert.ok(html.includes('Salta'));
  assert.ok(!html.includes('Paraguay'));
  assert.equal((html.match(/class="report-country-map"/g) || []).length, 1);
});

test('geography retains unrounded spend and results even without investment', () => {
  const data = aggregateGeography([
    { country: 'PY', region: 'Central', spend: '0.01' },
    { country: 'AR', spend: '0', actions: [{ action_type: 'onsite_conversion.messaging_conversation_started_7d', value: '1' }] },
    { country: 'PE', spend: '0', actions: [{ action_type: 'purchase', value: '1' }] },
    { country: 'BR', spend: '0', actions: [{ action_type: 'lead', value: '1' }] },
    { country: 'UY', spend: '0', action_values: [{ action_type: 'purchase', value: '0.01' }] },
  ]);
  assert.deepEqual(data.countries.map(country => country.countryId), ['PY', 'AR', 'PE', 'BR', 'UY']);
  assert.equal(data.countries[0].spend, 0.01);
  assert.deepEqual(aggregateGeography([{ country: 'PY', region: 'Central', spend: '0' }]), { countries: [], regions: [] });
});

test('voice and manual notes stay chronological and do not collapse repeated days', () => {
  const notes = [
    { id:'v',accountId:'act_1',text:'Revisar campaña',timestamp:'2026-08-20T12:00:00Z',category:'observation' as const,tags:['Voz'] },
    { id:'m',accountId:'act_1',text:'Revisar campaña',timestamp:'2026-08-05T12:00:00Z',category:'change' as const },
    { id:'other',accountId:'act_2',text:'Otro cliente',timestamp:'2026-08-05',category:'change' as const },
  ];
  const result = collectReportLogs(notes, [{id:'mirror',clientId:'act_1',date:'2026-08-05',description:'Revisar campaña'}], '1', '2026-08');
  assert.deepEqual(result.logs.map(row => [row.date,row.source]), [['05/08','Manual'],['20/08','Voz']]);
});
test('remote notes respect month and year; ambiguous dates are flagged, never guessed', () => {
  const result = collectReportLogs([], [{id:'a',date:'2025-08-03',description:'Old'}, {id:'b',date:'2026-09-03',description:'Next'}, {id:'c',date:'03/08',description:'Uncertain'}, {id:'d',date:'2026-08-03',description:'Correct'}], '1', '2026-08');
  assert.deepEqual(result.logs.map(row => row.description), ['Correct']); assert.equal(result.unresolved,1);
});
test('same source notes and repeated same-day actions retain separate identities', () => {
  const result = collectReportLogs([], [{id:'a',date:'2026-08-03',description:'Revisión'}, {id:'b',date:'2026-08-03',description:'Revisión'}], '1', '2026-08');
  assert.equal(result.logs.length,2);
});
test('timeline prints all records, alternating pairs, and an explicit empty state', () => {
  const logs = Array.from({length:21},(_,index)=>({id:String(index),date:'01/08',description:'Registro '+index}));
  const html = renderToStaticMarkup(<ManagementTimelineV2 logs={logs}/>);
  assert.equal((html.match(/role="listitem"/g)||[]).length,21); assert.ok(html.includes('is-reversed')); assert.ok(html.includes('Registro 20'));
  assert.ok(renderToStaticMarkup(<ManagementTimelineV2 logs={[]}/>).includes('No se encontraron anotaciones'));
});
test('map matching is country-scoped, accent-insensitive and never estimates activity', () => {
  const row = {regionId:'AR_Cordoba',countryId:'AR',regionName:'Córdoba · Argentina',messages:4,purchases:0,revenue:0,spend:100};
  assert.ok(matchMapRegion(row,'ARG',{id:'AR-X',properties:{name:'Cordoba'}}));
  assert.equal(matchMapRegion({...row,countryId:'ES'},'ARG',{id:'AR-X',properties:{name:'Cordoba'}}),false);
  assert.equal(mapCountryId('PE'),'PER'); assert.notEqual(activityColor(undefined,10),activityColor(0,10)); assert.notEqual(activityColor(1,10),activityColor(10,10));
});
test('funnel is an SVG illustration with unavailable reach stated explicitly', () => {
  const html = renderToStaticMarkup(<ReportFunnelBoard spend={100} ctr={1} purchases={0} messages={2} atc={0} tracking="messaging" impressions={1000} clicks={10}/>);
  assert.ok(html.includes('report-funnel-svg')); assert.equal((html.match(/<path /g)||[]).length,4); assert.ok(html.includes('No disponible')); assert.ok(html.includes('no a escala'));
});
test('Argentina actually renders its regional map and highlights Buenos Aires', () => {
  const html = renderToStaticMarkup(<ReportActivityMap mode="messaging" currency="ARS" countries={[{countryId:'AR',messages:5,purchases:0,revenue:0,spend:100}]} regions={[{countryId:'AR',regionId:'AR_Buenos Aires',regionName:'Buenos Aires · Argentina',messages:5,purchases:0,revenue:0,spend:100}]} />);
  assert.ok(html.includes('Detalle regional')); assert.ok(html.includes('Mapa regional de Argentina')); assert.ok(!html.includes('No hay cartografía regional'));
  assert.ok(html.includes('Buenos Aires: 5')); assert.ok(html.includes(activityPalette[3]));
});

test('Argentina and Peru both print regional maps with the same activity scale', () => {
  const countries = [{countryId:'AR',messages:51,purchases:0,revenue:0,spend:100}, {countryId:'PE',messages:11,purchases:0,revenue:0,spend:25}];
  const regions = [{countryId:'AR',regionId:'AR_Buenos Aires',regionName:'Buenos Aires · Argentina',messages:11,purchases:0,revenue:0,spend:100}, {countryId:'PE',regionId:'PE_Lima',regionName:'Lima Region · Perú',messages:11,purchases:0,revenue:0,spend:25}];
  const html = renderToStaticMarkup(<ReportActivityMap mode="messaging" currency="ARS" countries={countries} regions={regions} />);
  assert.equal((html.match(/class="report-country-map"/g)||[]).length, 2);
  assert.ok(html.includes('Mapa regional de Argentina')); assert.ok(html.includes('Mapa regional de Perú'));
  assert.ok(html.includes('Lima: 11')); assert.ok(html.includes('Buenos Aires: 11'));
  assert.equal((html.match(new RegExp(`fill="${activityPalette[3]}"`, 'g'))||[]).length, 2);
  assert.ok(!html.includes('<select')); assert.ok(html.includes('Escala de color compartida'));
  assert.ok(html.includes('82,3%')); assert.ok(html.includes('17,7%'));
});

test('Peru aliases keep metropolitan Lima distinct from Lima department', () => {
  const lima = {id:'PE-LIM',properties:{name:'Lima'}};
  const metro = {id:'PE-LMA',properties:{name:'Municipalidad Metropolitana de Lima'}};
  const row = {countryId:'PE',regionId:'PE_Lima',regionName:'Lima Region · Perú',messages:11,purchases:0,revenue:0,spend:25};
  assert.ok(matchMapRegion(row,'PER',lima)); assert.equal(matchMapRegion(row,'PER',metro),false);
  const city = {...row,regionName:'Lima Province · Perú'};
  assert.ok(matchMapRegion(city,'PER',metro)); assert.equal(matchMapRegion(city,'PER',lima),false);
  const resolvedCity = {...row,regionId:'PE-LMA',regionName:'Lima'};
  assert.ok(matchMapRegion(resolvedCity,'PER',metro)); assert.equal(matchMapRegion(resolvedCity,'PER',lima),false);
  assert.ok(matchMapRegion({...row,regionName:'Callao Region · Perú'},'PER',{id:'PE-CAL',properties:{name:'El Callao'}}));
  assert.ok(matchMapRegion({...row,regionName:'Cuzco · Perú'},'PER',{id:'PE-CUS',properties:{name:'Cusco'}}));
});

test('country cards preserve unsupported geography and unmatched regions without estimates', () => {
  const html = renderToStaticMarkup(<ReportActivityMap mode="messaging" currency="ARS" countries={['AR','PE','MX','XX'].map(countryId=>({countryId,messages:1,purchases:0,revenue:0,spend:10}))} regions={[{countryId:'PE',regionId:'PE_Unknown',regionName:'Sin identificar · Perú',messages:3,purchases:0,revenue:0,spend:10}]} />);
  assert.equal((html.match(/class="report-country-map"/g)||[]).length,4);
  assert.ok(html.includes('Sin cartografía regional')); assert.ok(html.includes('Sin contorno disponible'));
  assert.ok(html.includes('Sin identificar')); assert.ok(html.includes('Sin ubicar en el mapa'));
  assert.ok(!html.includes('NaN')); assert.ok(!html.includes('Infinity')); assert.ok(!html.includes('Lima: 3'));
});

test('regional heat uses purchases for ecommerce and spend only when results are absent', () => {
  const country = {countryId:'PE',messages:30,purchases:2,revenue:100,spend:0.02};
  const region = {...country,regionId:'PE_Lima',regionName:'Lima'};
  const purchases = renderToStaticMarkup(<ReportActivityMap mode="ecommerce" currency="USD" countries={[country]} regions={[region]} />);
  assert.ok(purchases.includes('Lima: 2')); assert.ok(purchases.includes('2 compras'));
  const spend = renderToStaticMarkup(<ReportActivityMap mode="ecommerce" currency="USD" countries={[{...country,purchases:0}]} regions={[{...region,purchases:0}]} />);
  assert.ok(spend.includes('inversión por región')); assert.ok(spend.includes(activityPalette[3]));
  assert.equal(activityColor(0.02,0.02),activityPalette[3]);
});

test('creative gallery retains five full names, visible images, metrics and ecommerce revenue', () => {
  const assets = Array.from({length:5},(_,index)=>({id:String(index),name:'Creatividad completa '+index,thumbnail:'data:image/png;base64,abc',spend:100,messages:2,purchases:3,revenue:250,roas:2.5}));
  const html = renderToStaticMarkup(<AssetPerformanceV2 mode="ecommerce" currency="ARS" assets={assets}/>);
  assert.equal((html.match(/class="report-ad-card"/g)||[]).length,5);
  assert.equal((html.match(/<img /g)||[]).length,5);
  for (const ad of assets) assert.ok(html.includes(ad.name));
  for (const label of ['Compras','ROAS','Inversión','Facturación','2,50x']) assert.ok(html.includes(label));
  assert.ok(!html.includes('<table'));
  const unavailable = renderToStaticMarkup(<AssetPerformanceV2 assets={[{...assets[0],thumbnail:''}]}/>);
  assert.ok(unavailable.includes('Miniatura no disponible'));
});
test('a Meta outage does not remove the monthly management history', () => {
  const html = renderToStaticMarkup(<MonthlyReportDocument name="Cliente" month="2026-08" mode="messaging" metrics={reportPeriodMetrics(null, [], 'ARS')} dataAvailable={false} daily={[]} assets={[]} demographics={[]} countries={[]} regions={[]} placements={[]} placementBasis="spend" texts={{}} isEditing={false} onUpdate={()=>undefined} logs={[{id:'voice',date:'05/08',source:'Voz',description:'Registro que debe conservarse'}]} />);
  assert.ok(html.includes('No hay métricas disponibles')); assert.ok(html.includes('Bitácora de gestión')); assert.ok(html.includes('Registro que debe conservarse'));
});

test('ad traffic parses Meta fields without turning missing values into zero', () => {
  for (const field of ['clicks','impressions','ctr','spend']) assert.ok(AD_TRAFFIC_FIELDS.split(',').includes(field));
  assert.deepEqual(adTrafficMetrics({clicks:'25',impressions:'2000',ctr:'1.25',spend:'100'}), {clicks:25,impressions:2000,ctr:1.25,cpc:4});
  for (const value of [undefined,null,'', ' ', 'invalid',NaN,Infinity,-1,true]) {
    assert.deepEqual(adTrafficMetrics({clicks:value,impressions:value,ctr:value,spend:value}), {clicks:undefined,impressions:undefined,ctr:undefined,cpc:undefined});
  }
});

test('traffic ratios respect explicit zeros and never divide by zero', () => {
  assert.equal(adTrafficMetrics({clicks:25,impressions:2000}).ctr,1.25);
  assert.equal(adTrafficMetrics({clicks:25,impressions:2000,ctr:0}).ctr,0);
  assert.deepEqual(adTrafficMetrics({clicks:0,impressions:2000,spend:50}), {clicks:0,impressions:2000,ctr:0,cpc:undefined});
  assert.equal(adTrafficMetrics({clicks:25,impressions:0}).ctr,undefined);
  assert.equal(adTrafficMetrics({clicks:25}).cpc,undefined);
  assert.equal(adTrafficMetrics({clicks:25,spend:0}).cpc,0);
});

test('ad cards print all four traffic metrics in all three report modes', () => {
  const ad = {id:'ad',name:'Prueba CTR',thumbnail:'',spend:19.5,purchases:1,messages:1,revenue:80,roas:4,traffic:adTrafficMetrics({clicks:25,impressions:2000,ctr:1.25,spend:19.5})};
  for (const mode of ['messaging','ecommerce','leads'] as const) {
    const html = renderToStaticMarkup(<AssetPerformanceV2 mode={mode} currency="USD" assets={[ad]}/>);
    const row = html.split('class="report-ad-traffic"')[1].split('</dl>')[0];
    for (const value of ['CTR (todos)','Clics (todos)','Impresiones','Costo / clic','1,25%','>25<','2.000','U$D 0,78']) assert.ok(row.includes(value),value);
    assert.ok(html.includes('no solo los del enlace'));
  }
  assert.equal(formatCurrency(19.5,'ARS'),'$20');
  assert.equal(formatCurrency(0.78,'ARS',2),'$0,78');
});

test('unavailable traffic remains unavailable despite legacy zero defaults', () => {
  const ad = {id:'ad',name:'Sin datos de tráfico',thumbnail:'',spend:100,purchases:0,revenue:0,roas:0,ctr:0,clicks:0,traffic:adTrafficMetrics({})};
  const html = renderToStaticMarkup(<AssetPerformanceV2 mode="messaging" assets={[ad]}/>);
  const row = html.split('class="report-ad-traffic"')[1].split('</dl>')[0];
  assert.equal((row.match(/<dd>—<\/dd>/g)||[]).length,4);
  assert.ok(!row.includes('0,00%'));
});

test('small positive traffic rates and costs never round down to displayed zero', () => {
  const html = renderToStaticMarkup(<AssetPerformanceV2 mode="messaging" currency="USD" assets={[{id:'tiny',name:'Valores pequeños',thumbnail:'',spend:1,purchases:0,revenue:0,roas:0,traffic:{ctr:0.0028,clicks:1000,impressions:35000000,cpc:0.001}}]}/>);
  const row = html.split('class="report-ad-traffic"')[1].split('</dl>')[0];
  assert.ok(row.includes('&lt;0,01%')); assert.ok(row.includes('&lt;U$D 0,01'));
  assert.ok(!row.includes('>0,00%'));
});

test('Meta lead aliases never double count or override an explicit aggregate zero', () => {
  const aliases = ['offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped'];
  const actions = aliases.map(action_type => ({ action_type, value: '8' }));
  assert.equal(metaLeadCount([{action_type:'lead',value:'12'}, ...actions]),12);
  assert.equal(metaLeadCount([{action_type:'lead',value:'0'}, ...actions]),0);
  assert.equal(metaLeadCount(actions),8);
  for (const action_type of aliases) assert.equal(metaLeadCount([{action_type,value:'8'}]),8);
  for (const value of [-1,Infinity,NaN,'invalid']) assert.equal(metaLeadCount([{action_type:'lead',value}]),0);
  assert.equal(metaLeadCount(),0);
  assert.equal(metaLeadCount([{action_type:'purchase',value:20}]),0);
});

test('lead period totals and daily fallback use leads independently of messages and purchases', () => {
  const daily = [{date:'2026-08-02',spend:100,leads:4,messages:40,purchases:30}, {date:'2026-08-03',spend:50,leads:0}];
  const metrics = reportPeriodMetrics({spend:300,actions:[{action_type:'lead',value:'6'}]},daily,'USD');
  assert.equal(metrics.leads,6); assert.equal(metrics.costPerLead,50);
  const fallback = reportPeriodMetrics(null,daily,'USD');
  assert.equal(fallback.leads,4); assert.equal(fallback.costPerLead,37.5);
  const series = completeDailySeries(daily,'2026-08');
  assert.equal(series[0].leads,null); assert.equal(series[1].leads,4); assert.equal(series[2].leads,0);
  assert.equal(reportPeriodMetrics({spend:100,actions:[{action_type:'lead',value:0}]},daily,'USD').leads,0);
});

test('lead placements and geography preserve the selected event and both countries', () => {
  const rows = [
    {country:'AR',region:'Buenos Aires',publisher_platform:'instagram',platform_position:'feed',spend:100,actions:[{action_type:'lead',value:3},{action_type:'purchase',value:50}]},
    {country:'PE',region:'Lima',publisher_platform:'facebook',platform_position:'feed',spend:300,actions:[{action_type:'onsite_conversion.lead_grouped',value:1}]},
  ];
  const placements = aggregatePlacements(rows,'leads');
  assert.equal(placements.basis,'leads'); assert.deepEqual(placements.data.map(row=>row.value),[75,25]);
  const geo = aggregateGeography(rows);
  assert.deepEqual(geo.countries.map(row=>row.leads),[3,1]); assert.deepEqual(geo.regions.map(row=>row.leads),[3,1]);
  const html = renderToStaticMarkup(<GeographicSummary {...geo} mode="leads" currency="USD" expectedResults={4}/>);
  for (const label of ['Mapa regional de Argentina según clientes potenciales','Mapa regional de Perú según clientes potenciales','Buenos Aires: 3','Lima: 1','3 clientes potenciales','1 clientes potenciales']) assert.ok(html.includes(label),label);
  assert.ok(!html.includes('Diferencia a revisar')); assert.ok(!html.includes('50 compras'));
  const withoutLeads = [{...rows[0],actions:[{action_type:'purchase',value:50}]}];
  assert.equal(aggregatePlacements(withoutLeads,'leads').basis,'spend');
  const emptyGeo = renderToStaticMarkup(<GeographicSummary {...aggregateGeography(withoutLeads)} mode="leads" currency="USD" expectedResults={0}/>);
  assert.ok(emptyGeo.includes('inversión por región')); assert.ok(!emptyGeo.includes('NaN'));
});

test('lead daily chart plots lead bars and investment, not purchase or revenue series', () => {
  const html = renderToStaticMarkup(<PerformanceChartV2 mode="leads" currency="USD" expectedResults={4} data={[{date:'02/08',leads:4,messages:20,purchases:60,spend:80,revenue:9000}]}/>);
  assert.ok(html.includes('Clientes potenciales y inversión por día'));
  assert.ok(html.includes('02/08: 4 clientes potenciales')); assert.ok(html.includes('Pico de clientes potenciales'));
  assert.ok(!html.includes('Facturación')); assert.ok(!html.includes('9.000')); assert.ok(!html.includes('requiere revisión'));
});

test('lead report renders its KPIs, funnel, ad ranking, glossary and intact management timeline', () => {
  assert.deepEqual(Object.keys(REPORT_MODES),['ecommerce','messaging','leads']);
  const metrics = {...reportPeriodMetrics({spend:120,clicks:20,impressions:1000,reach:500,actions:[{action_type:'lead',value:4}]},[],'USD'),purchases:90,messages:50};
  const baseAd = {thumbnail:'',spend:60,roas:8,revenue:480,purchases:40,messages:10};
  const html = renderToStaticMarkup(<MonthlyReportDocument name="Cliente de leads" month="2026-08" mode="leads" metrics={metrics} daily={[]} assets={[{...baseAd,id:'a',name:'Menos leads',leads:1},{...baseAd,id:'b',name:'Más leads',leads:3}]} demographics={[]} countries={[]} regions={[]} placements={[]} placementBasis="leads" texts={{}} isEditing={false} onUpdate={()=>undefined} logs={[{id:'v',date:'02/08',source:'Voz',description:'Nota de voz conservada'},{id:'m',date:'03/08',source:'Manual',description:'Nota manual conservada'}]}/>);
  for (const label of ['Informe mensual · Clientes potenciales','Costo por lead (CPL)','4 clientes potenciales','U$D 30','Clic a cliente potencial','Costo / lead (CPL)','report-funnel-svg','Nota de voz conservada','Nota manual conservada','Evento lead atribuido por Meta']) assert.ok(html.includes(label),label);
  assert.ok(html.indexOf('Más leads') < html.indexOf('Menos leads'));
  assert.ok(!html.includes('ROAS')); assert.ok(!html.includes('Facturación')); assert.ok(!html.includes('Mensajes iniciados'));
});

test('zero lead ads do not substitute other conversions or display a false CPL', () => {
  const html = renderToStaticMarkup(<AssetPerformanceV2 mode="leads" assets={[{id:'ad',name:'Sin leads',thumbnail:'',spend:60,leads:0,messages:90,purchases:50,roas:10,revenue:600}]}/>);
  assert.ok(html.includes('<dt>Clientes potenciales</dt><dd>0</dd>'));
  assert.ok(html.includes('<dt>Costo / lead (CPL)</dt><dd>—</dd>'));
  assert.ok(html.includes('Sin resultados registrados')); assert.ok(!html.includes('Infinity'));
});

test('all geographic regions are printable, including rows beyond the three map highlights', () => {
  const regions = Array.from({length:65},(_,index)=>({countryId:index % 2 ? 'PE' : 'AR',regionId:'zone-'+index,regionName:'Zona de prueba '+index,messages:index,leads:64-index,purchases:2,spend:100,revenue:0}));
  const countries = [{countryId:'AR',messages:100,leads:100,purchases:2,spend:100,revenue:0},{countryId:'PE',messages:100,leads:100,purchases:2,spend:100,revenue:0}];
  for (const mode of ['messaging','ecommerce','leads'] as const) {
    const html = renderToStaticMarkup(<GeographicSummary countries={countries} regions={regions} expectedResults={200} currency="ARS" mode={mode}/>);
    const list = html.split('<div class="report-region-list">')[1];
    assert.ok(list); assert.ok(!list.includes('<details')); assert.ok(!list.includes('report-screen-only'));
    assert.equal((list.match(/<tr>/g)||[]).length,66);
    for (const region of regions) assert.ok(list.includes(region.regionName));
    assert.ok(list.includes('Región / país')); assert.ok(list.includes('Argentina')); assert.ok(list.includes('Perú'));
    assert.ok(list.includes('no por ciudad'));
  }
});

test('share links are obtained from Meta independently and failures remain unavailable', async () => {
  const link = 'https://fb.me/adspreview/test-share';
  let calls = 0;
  const result = await fetchAdShareLink('123', async (path, params) => {
    calls++; assert.equal(path,'/123'); assert.deepEqual(params,{fields:AD_SHARE_LINK_FIELD});
    return {preview_shareable_link:link};
  });
  assert.equal(calls,1); assert.equal(result,link);
  for (const response of [{},null,{error:{message:'Permission missing'}},{preview_shareable_link:'javascript:alert(1)'}]) {
    assert.equal(await fetchAdShareLink('123', async ()=>response),undefined);
  }
  assert.equal(await fetchAdShareLink('123', async ()=>{throw new Error('Offline');}),undefined);
});

test('public report links reject credentials, iframe previews, fabricated library links and unsafe protocols', () => {
  assert.equal(safeMetaShareLink('https://www.facebook.com/ads/preview/?demo=123&amp;share=456'),'https://www.facebook.com/ads/preview/?demo=123&share=456');
  for (const link of [undefined,'','javascript:alert(1)','http://facebook.com/preview','https://facebook.com.evil.example/ad','https://user:password@facebook.com/ad','https://www.facebook.com/ads/api/preview?ad_id=1','https://www.facebook.com/ads/library/?id=1','https://fb.me/adspreview/test?access_token=secret','https://facebook.com/preview?APPSECRET_PROOF=secret']) assert.equal(safeMetaShareLink(link),undefined);
});

test('ad share buttons remain printable and missing share links never fall back to the library', () => {
  const ad = {id:'a',name:'Anuncio compartido',thumbnail:'',spend:100,messages:3,purchases:2,revenue:200,roas:2,shareablePreviewUrl:'https://fb.me/adspreview/test-share',previewUrl:'https://www.facebook.com/ads/library/?id=123'};
  for (const mode of ['messaging','ecommerce','leads'] as const) {
    const html = renderToStaticMarkup(<AssetPerformanceV2 mode={mode} assets={[ad,{...ad,id:'b',shareablePreviewUrl:undefined}]}/>);
    assert.ok(html.includes('class="report-ad-preview" href="https://fb.me/adspreview/test-share"'));
    assert.ok(html.includes('target="_blank" rel="noopener noreferrer"'));
    assert.ok(html.includes('Ver anuncio en Meta')); assert.ok(html.includes('lucide-external-link'));
    assert.ok(html.includes('Enlace no disponible')); assert.ok(!html.includes('href="https://www.facebook.com/ads/library'));
    assert.ok(!html.includes('report-screen-only report-ad-preview'));
  }
});

test('ad preview actions sit after the metrics, outside the thumbnail and content', () => {
  const ad = {id:'a',name:'Anuncio vertical',thumbnail:'https://example.com/portrait.png',spend:100,messages:3,leads:2,purchases:2,revenue:200,roas:2,shareablePreviewUrl:'https://fb.me/adspreview/test-share'};
  for (const mode of ['messaging','ecommerce','leads'] as const) {
    const html = renderToStaticMarkup(<AssetPerformanceV2 mode={mode} assets={[ad,{...ad,id:'b',shareablePreviewUrl:undefined}]}/>);
    const cards = html.match(/<li class="report-ad-card">[\s\S]*?<\/li>/g) || [];
    assert.equal(cards.length, 2);
    for (const card of cards) {
      const media = card.slice(card.indexOf('class="report-ad-media"'), card.indexOf('class="report-ad-content"'));
      assert.ok(media.includes('<img'));
      assert.ok(!media.includes('report-ad-preview'));
      assert.match(card, /<\/dl><\/div><(?:a|span) class="report-ad-preview/);
      assert.ok(card.indexOf('report-ad-preview') > card.indexOf('report-ad-traffic'));
    }
  }
});
