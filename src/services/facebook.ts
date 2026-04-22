import { AdAccount, Ad, DailyMetric } from '../types';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const MESSAGING_OBJECTIVES = new Set([
  'MESSAGES',
  'OUTCOME_ENGAGEMENT',
  'PAGE_LIKES',
  'LEAD_GENERATION',
]);

export function initFacebookSdk(appId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.FB) {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      });
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: false,
        version: 'v19.0',
      });
      resolve(true);
    };
    document.head.appendChild(script);
  });
}

export function loginWithFacebook(): Promise<any> {
  return new Promise((resolve, reject) => {
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject(new Error('User cancelled login or did not fully authorize.'));
        }
      },
      { scope: 'ads_read,ads_management,business_management,public_profile' }
    );
  });
}

export function getFacebookLoginStatus(): Promise<any> {
  return new Promise((resolve) => {
    window.FB.getLoginStatus((response: any) => {
      resolve(response);
    });
  });
}

async function fetchAllPages(url: string, params: any): Promise<any[]> {
  const results: any[] = [];
  let nextUrl = url;
  let nextParams = { ...params };

  while (true) {
    const response: any = await new Promise((resolve, reject) => {
      window.FB.api(nextUrl, 'GET', nextParams, (res: any) => {
        if (!res) reject(new Error('No response from Meta API'));
        if (res.error) reject(new Error(res.error.message || JSON.stringify(res.error)));
        resolve(res);
      });
    });

    results.push(...(response.data || []));

    if (
      response.paging &&
      response.paging.cursors &&
      response.paging.cursors.after &&
      response.data &&
      response.data.length > 0
    ) {
      nextParams = { ...params, after: response.paging.cursors.after };
    } else {
      break;
    }
  }

  return results;
}

export async function getAdAccounts(): Promise<AdAccount[]> {
  const accounts = await fetchAllPages('/me/adaccounts', {
    fields: 'id,name,account_id,account_status,currency',
    limit: 100,
  });
  return accounts;
}

export async function getUserProfile(): Promise<any> {
  return new Promise((resolve, reject) => {
    window.FB.api('/me', 'GET', { fields: 'name,picture' }, (response: any) => {
      if (response && !response.error) {
        resolve(response);
      } else {
        reject(new Error(response?.error?.message || 'Failed to get user profile'));
      }
    });
  });
}

function getAction(arr: any[], type: string): number {
  const f = (arr || []).find((a: any) => a.action_type === type);
  return f ? parseFloat(f.value) : 0;
}

export async function fetchInsights(accountId: string, since: string, until: string): Promise<Partial<AdAccount>> {
  const time_range = JSON.stringify({ since, until });
  const fields = 'spend,clicks,ctr,impressions,actions,action_values';

  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', { fields, time_range, level: 'account' }, (res: any) => {
      resolve(res);
    });
  });

  if (!response || !response.data || !response.data.length) {
    return {
      spend: 0,
      clicks: 0,
      ctr: 0,
      impressions: 0,
      revenue: 0,
      purchases: 0,
      addToCart: 0,
      checkouts: 0,
      costPerPurchase: 0,
      messages: 0,
      costPerMessage: 0,
      messagesReal: 0,
      costPerMessageReal: 0,
    };
  }

  const d = response.data[0];
  const spend = parseFloat(d.spend) || 0;
  const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
  const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase');
  const messages = getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d') || getAction(d.actions, 'onsite_conversion.total_messaging_connection');

  // Fetch real messaging data if needed
  const msgData = await fetchMessagingCampaignInsights(accountId, since, until);

  return {
    spend,
    clicks: parseInt(d.clicks) || 0,
    ctr: parseFloat(d.ctr) || 0,
    impressions: parseInt(d.impressions) || 0,
    revenue,
    purchases,
    addToCart: getAction(d.actions, 'add_to_cart') || getAction(d.actions, 'offsite_conversion.fb_pixel_add_to_cart'),
    checkouts: getAction(d.actions, 'initiate_checkout') || getAction(d.actions, 'offsite_conversion.fb_pixel_initiate_checkout'),
    costPerPurchase: purchases > 0 ? spend / purchases : 0,
    messages,
    costPerMessage: messages > 0 ? spend / messages : 0,
    ...msgData,
  };
}

async function fetchMessagingCampaignInsights(accountId: string, since: string, until: string): Promise<{ messagesReal: number; costPerMessageReal: number }> {
  const time_range = JSON.stringify({ since, until });

  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'spend,actions,campaign_id',
      time_range,
      level: 'campaign',
      limit: 500,
    }, (res: any) => resolve(res));
  });

  if (!response || response.error || !response.data || !response.data.length) {
    return { messagesReal: 0, costPerMessageReal: 0 };
  }

  const campaigns: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/campaigns`, 'GET', {
      fields: 'id,objective',
      limit: 500,
    }, (res: any) => resolve(res));
  });

  if (!campaigns || campaigns.error || !campaigns.data) {
    return { messagesReal: 0, costPerMessageReal: 0 };
  }

  const objMap: Record<string, string> = {};
  campaigns.data.forEach((c: any) => {
    objMap[c.id] = c.objective;
  });

  let messagesReal = 0;
  let spendMsg = 0;

  response.data.forEach((d: any) => {
    const obj = objMap[d.campaign_id] || '';
    if (!MESSAGING_OBJECTIVES.has(obj)) return;
    const msgs = getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                 getAction(d.actions, 'onsite_conversion.total_messaging_connection');
    messagesReal += msgs;
    spendMsg += parseFloat(d.spend) || 0;
  });

  return {
    messagesReal,
    costPerMessageReal: messagesReal > 0 ? spendMsg / messagesReal : 0,
  };
}

export async function fetchTopAds(accountId: string, since: string, until: string, n: number, sortBy: string): Promise<Ad[]> {
  const time_range = JSON.stringify({ since, until });

  const insRes: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'ad_id,ad_name,spend,ctr,actions,action_values',
      time_range,
      level: 'ad',
      limit: 500,
    }, (res: any) => resolve(res));
  });

  if (!insRes || insRes.error || !insRes.data || !insRes.data.length) return [];

  const sortKey = (sortBy === 'purchases' || sortBy === 'revenue') ? sortBy : 'roas';
  const ads = insRes.data
    .map((d: any) => {
      const spend = parseFloat(d.spend) || 0;
      const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
      const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase');
      const ctr = parseFloat(d.ctr) || 0;
      const roas = spend > 0 ? revenue / spend : 0;
      return {
        id: d.ad_id,
        name: d.ad_name || d.ad_id,
        spend,
        purchases,
        revenue,
        ctr,
        roas,
        thumbnail: null,
        previewUrl: null,
      };
    })
    .filter((a: any) => a.spend > 0)
    .sort((a: any, b: any) => (b[sortKey] || 0) - (a[sortKey] || 0))
    .slice(0, n);

  // Fetch thumbnails and previews
  for (const ad of ads) {
    // Paso 0: Llamada inicial (v19)
    const adRes: any = await new Promise((resolve) => {
      window.FB.api(`/${ad.id}`, 'GET', {
        fields: 'creative{id,image_url,image_hash,thumbnail_url.width(1000).height(1000),object_story_spec,asset_feed_spec,effective_object_story_id,object_story_id,video_id,instagram_story_id}'
      }, (res: any) => resolve(res));
    });

    if (adRes && !adRes.error && adRes.creative) {
      const creative = adRes.creative;
      let thumb = null;
      // Priorizamos image_url como base
      const baseThumb = creative.image_url || creative.thumbnail_url;

      // Paso 1: Resolver por image_hash (FUENTE SUPREMA)
      // Buscamos hashes en: raíz, video_data, link_data, assets y también en el STORY (Reels)
      const hashes = new Set<string>();
      if (creative.image_hash) hashes.add(creative.image_hash);
      
      const linkData = creative.object_story_spec?.link_data;
      if (linkData?.image_hash) hashes.add(linkData.image_hash);
      linkData?.child_attachments?.forEach((c: any) => { if (c.image_hash) hashes.add(c.image_hash); });

      const videoData = creative.object_story_spec?.video_data;
      if (videoData?.image_hash) hashes.add(videoData.image_hash);

      creative.asset_feed_spec?.images?.forEach((img: any) => { if (img.hash) hashes.add(img.hash); });
      creative.asset_feed_spec?.videos?.forEach((v: any) => { if (v.image_hash) hashes.add(v.image_hash); });

      // Intento extra: Buscar hash en el post original (Vital para Reels e IG Media)
      const sIdForHash = creative.instagram_story_id || creative.effective_object_story_id || creative.object_story_id;
      if (sIdForHash) {
        try {
          const sHashRes: any = await new Promise((resolve) => {
            window.FB.api(`/${sIdForHash}`, 'GET', { fields: 'image_hash' }, (res: any) => resolve(res));
          });
          if (sHashRes?.image_hash) hashes.add(sHashRes.image_hash);
        } catch (e) {}
      }

      if (hashes.size > 0) {
        try {
          const imgRes: any = await new Promise((resolve) => {
            window.FB.api(`/${accountId}/adimages`, 'GET', {
              hashes: Array.from(hashes),
              fields: 'hash,url'
            }, (res: any) => resolve(res));
          });
          if (imgRes?.data?.length > 0) {
            thumb = imgRes.data[0].url;
            console.log(`[TopAds] Paso 1 - resolved via deep hashes (${hashes.size}): ${ad.name}`);
          }
        } catch (e) {}
      }

      // Paso 2: Story assets (Attachments / Reels / IG Media)
      if (!thumb || thumb.includes('safe_image.php')) {
        const storyId = creative.instagram_story_id || creative.effective_object_story_id || creative.object_story_id;
        if (storyId) {
          try {
            const storyRes: any = await new Promise((resolve) => {
              window.FB.api(`/${storyId}`, 'GET', { 
                fields: 'full_picture,picture,attachments{media{image{src,height,width}},subattachments{media{image{src,height,width}}}},media_url,display_url,thumbnail_url' 
              }, (res: any) => resolve(res));
            });
            
            if (storyRes) {
              let bestMedia = null;
              let maxArea = 0;
              
              const checkMedia = (media: any) => {
                const img = media?.image;
                if (img?.src) {
                  const area = (img.width || 1) * (img.height || 1);
                  if (area >= maxArea) {
                    maxArea = area;
                    bestMedia = img.src;
                  }
                }
              };

              storyRes.attachments?.data?.forEach((att: any) => {
                checkMedia(att.media);
                att.subattachments?.data?.forEach((sub: any) => checkMedia(sub.media));
              });

              // Para Instagram Reels/Posts: media_url, display_url o thumbnail_url (del nodo story) suelen ser HD
              thumb = bestMedia || storyRes.display_url || storyRes.media_url || storyRes.thumbnail_url || storyRes.full_picture || storyRes.picture || thumb;
              if (thumb && !thumb.includes('safe_image.php')) console.log(`[TopAds] Paso 2 - story/IG ok: ${ad.name}`);
            }
          } catch (e) {}
        }
      }

      // Paso 3: Video Node (Miniatura HD del Video)
      const vidId = creative.video_id || 
                    creative.object_story_spec?.video_data?.video_id || 
                    creative.asset_feed_spec?.videos?.[0]?.video_id ||
                    creative.object_story_spec?.template_data?.video_id ||
                    creative.object_story_spec?.link_data?.video_id;

      if ((!thumb || thumb.includes('safe_image.php')) && vidId) {
        try {
          // Pedimos también el edge 'thumbnails' por si 'format' no tiene la imagen HD
          const vidNode: any = await new Promise((resolve) => {
            window.FB.api(`/${vidId}`, 'GET', { 
              fields: 'picture,format,thumbnails.limit(5){uri,width,height}' 
            }, (res: any) => resolve(res));
          });
          
          if (vidNode) {
            let bestVidImg = vidNode.picture;
            let maxVidArea = 0;

            // Opción A: Buscar en formats
            if (Array.isArray(vidNode.format)) {
              vidNode.format.forEach((f: any) => {
                if (f.picture) {
                  const area = (f.width || 0) * (f.height || 0);
                  if (area >= maxVidArea) {
                    maxVidArea = area;
                    bestVidImg = f.picture;
                  }
                }
              });
            }

            // Opción B: Si thumbnails tiene algo más grande, lo usamos
            if (vidNode.thumbnails?.data) {
              vidNode.thumbnails.data.forEach((t: any) => {
                const area = (t.width || 0) * (t.height || 0);
                if (area >= maxVidArea) {
                  maxVidArea = area;
                  bestVidImg = t.uri;
                }
              });
            }
            
            thumb = bestVidImg || thumb;
            if (thumb && !thumb.includes('safe_image.php')) console.log(`[TopAds] Paso 3 - video format/thumbnails ok: ${ad.name}`);
          }
        } catch (e) {}
      }

      // Paso 4: Metadatos profundos (Fallback manual)
      if (!thumb || thumb.includes('safe_image.php')) {
        thumb = 
          creative.object_story_spec?.video_data?.image_url ||
          creative.asset_feed_spec?.videos?.[0]?.thumbnail_url ||
          creative.asset_feed_spec?.images?.[0]?.url ||
          creative.object_story_spec?.link_data?.picture ||
          creative.object_story_spec?.photo_data?.url ||
          creative.image_url ||
          creative.thumbnail_url;
      }

      ad.thumbnail = thumb || baseThumb || null;
    }

    const prevRes: any = await new Promise((resolve) => {
      window.FB.api(`/${ad.id}/previews`, 'GET', {
        ad_format: 'DESKTOP_FEED_STANDARD',
      }, (res: any) => resolve(res));
    });

    if (prevRes && !prevRes.error && prevRes.data && prevRes.data.length) {
      const iframeMatch = prevRes.data[0].body.match(/src="([^"]+)"/);
      if (iframeMatch) ad.previewUrl = iframeMatch[1].replace(/&amp;/g, '&');
    }
  }

  return ads as Ad[];
}

export async function fetchDailySeries(accountId: string, since: string, until: string, adIds: string[]): Promise<Record<string, DailyMetric[]>> {
  const time_range = JSON.stringify({ since, until });
  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'ad_id,date_start,spend,actions,action_values',
      time_range,
      level: 'ad',
      time_increment: 1,
      filtering: JSON.stringify([{ field: 'ad.id', operator: 'IN', value: adIds }]),
      limit: 1000,
    }, (res: any) => resolve(res));
  });

  const byAd: Record<string, DailyMetric[]> = {};
  if (response && !response.error && Array.isArray(response.data)) {
    response.data.forEach((d: any) => {
      const spend = parseFloat(d.spend) || 0;
      const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
      const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase');
      const roas = spend > 0 ? revenue / spend : 0;
      const adId = d.ad_id;
      if (!byAd[adId]) byAd[adId] = [];
      byAd[adId].push({ date: d.date_start, spend, purchases, revenue, roas });
    });
    Object.keys(byAd).forEach((k) => byAd[k].sort((a, b) => a.date.localeCompare(b.date)));
  }
  return byAd;
}
