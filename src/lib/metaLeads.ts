/** Prefer Meta's aggregate lead event. Fallback aliases are alternatives, not
 * additive counts: the same conversion may appear under more than one name. */
export function metaLeadCount(actions?: Array<{ action_type: string; value: unknown }>) {
  for (const type of ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped']) {
    const action = actions?.find(item => item.action_type === type);
    if (action) {
      const value = Number(action.value);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    }
  }
  return 0;
}
