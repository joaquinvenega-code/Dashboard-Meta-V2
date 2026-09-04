export const AD_SHARE_LINK_FIELD = 'preview_shareable_link';

// Only publish Meta's returned share link, never an authenticated iframe URL or
// an Ad Library URL fabricated from an Ads Manager ID.
export function safeMetaShareLink(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim().replace(/&amp;/g, '&'));
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    if (!(url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com') || url.hostname === 'fb.me')) return undefined;
    if (url.pathname.startsWith('/ads/library') || url.pathname.startsWith('/ads/api/preview')) return undefined;
    if ([...url.searchParams.keys()].some(key => /^(access_token|appsecret_proof|client_secret)$/i.test(key))) return undefined;
    return url.href;
  } catch { return undefined; }
}

export async function fetchAdShareLink(adId: string, request: (path: string, params: Record<string, string>) => Promise<any>) {
  try {
    const response = await request(`/${adId}`, { fields: AD_SHARE_LINK_FIELD });
    return response?.error ? undefined : safeMetaShareLink(response?.[AD_SHARE_LINK_FIELD]);
  } catch { return undefined; }
}
