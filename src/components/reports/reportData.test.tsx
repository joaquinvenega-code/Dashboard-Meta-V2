import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { aggregateDemographics, aggregatePlacements, completeDailySeries, countryLabel, reportAction, reportPeriodMetrics } from './reportData';
import { chartMaximum } from './v2/PerformanceChartV2';
import { AssetPerformanceV2 } from './v2/AssetPerformanceV2';
import { GeographicSummary } from './GeographicSummary';
import { collectReportLogs } from './reportLogs';
import { ManagementTimelineV2 } from './v2/ManagementTimelineV2';
import { ReportActivityMap, activityColor, matchMapRegion, mapCountryId } from './ReportActivityMap';
import { ReportFunnelBoard } from './ReportFunnelBoard';
import { MonthlyReportDocument } from './MonthlyReportDocument';

test('explicit zero is not replaced by a different action metric', () => {
  assert.equal(reportAction([{ action_type: 'a', value: '0' }, { action_type: 'b', value: '8' }], 'a', 'b'), 0);
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
  assert.ok(html.includes('Buenos Aires: 5')); assert.ok(html.includes('#d7301f'));
});
test('a Meta outage does not remove the monthly management history', () => {
  const html = renderToStaticMarkup(<MonthlyReportDocument name="Cliente" month="2026-08" mode="messaging" metrics={reportPeriodMetrics(null, [], 'ARS')} dataAvailable={false} daily={[]} assets={[]} demographics={[]} countries={[]} regions={[]} placements={[]} placementBasis="spend" texts={{}} isEditing={false} onUpdate={()=>undefined} logs={[{id:'voice',date:'05/08',source:'Voz',description:'Registro que debe conservarse'}]} />);
  assert.ok(html.includes('No hay métricas disponibles')); assert.ok(html.includes('Bitácora de gestión')); assert.ok(html.includes('Registro que debe conservarse'));
});
