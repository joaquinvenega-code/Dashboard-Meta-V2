/** An explicit empty selection must never become an unfiltered account query. */
export function reportCampaignFilter(campaignIds?: string[]) {
  if (campaignIds === undefined) return {};
  const ids = [...new Set(campaignIds)];
  if (!ids.length || ids.some(id => !/^\d+$/.test(id))) throw new Error('Elegí al menos una campaña válida.');
  return { filtering: JSON.stringify([{ field: 'campaign.id', operator: 'IN', value: ids }]) };
}
