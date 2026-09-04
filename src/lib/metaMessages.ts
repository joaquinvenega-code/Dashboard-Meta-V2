/** Messaging aliases are alternatives. An explicit zero in the preferred
 * event must not be replaced by the count of a different event. */
export function metaMessageCount(actions?: Array<{ action_type: string; value: unknown }>) {
  for (const type of ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection']) {
    const action = actions?.find(item => item.action_type === type);
    if (action) {
      const value = Number(action.value);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    }
  }
  return 0;
}
