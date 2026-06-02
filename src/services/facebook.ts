import { AdAccount, Ad, DailyMetric, Campaign, AdSet } from '../types';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export const MESSAGING_OBJECTIVES = new Set([
  'MESSAGES',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_SALES',
  'PAGE_LIKES',
  'LEAD_GENERATION',
]);

const MESSAGING_OPTIMIZATION_GOALS = new Set([
  'REPLIES',
  'CONVERSIONS',
  'LEAD_GENERATION'
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
    fields: 'id,name,account_id,account_status,currency,balance,account_type,spend_cap,amount_spent,funding_source_details{id,type,display_string},prepaid_balance{amount,currency},is_prepaid_account,extended_credit_invoice_group{id,name,balance{amount,currency}}',
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
    viewContent: getAction(d.actions, 'view_content') || getAction(d.actions, 'offsite_conversion.fb_pixel_view_content'),
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
      fields: 'id,objective,effective_status',
      limit: 500,
    }, (res: any) => resolve(res));
  });

  if (!campaigns || campaigns.error || !campaigns.data) {
    return { messagesReal: 0, costPerMessageReal: 0 };
  }

  // Also get adsets to check optimization goal if we want to be very precise, 
  // but let's try with objective + presence of messaging actions for now.
  // Actually, let's fetch insights per campaign and check if they have the specific action.
  
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
    
    // If it's OUTCOME_SALES, only count it if it actually generated messages (it could be a web sales campaign)
    // Actually, to be safer, we only count these campaigns if messaging is a significant part of their actions?
    // User said: "de las campañas que tiene como acción 'mensaje'".
    
    if (msgs > 0) {
      messagesReal += msgs;
      spendMsg += parseFloat(d.spend) || 0;
    }
  });

  return {
    messagesReal,
    costPerMessageReal: messagesReal > 0 ? spendMsg / messagesReal : 0,
  };
}

// Función segura para limpiar resoluciones restringidas de la CDN de Facebook
const ensureHighResFbCdn = (urlStr: string | null) => {
  return urlStr; // Modificando la URL rompemos los signatures del CDN (oh, oe). Mejor buscar el HD desde node.
};

export async function fetchTopAds(accountId: string, since: string, until: string, n: number, sortBy: string): Promise<Ad[]> {
  const buster = Math.floor(Math.random() * 9000) + 1000;
  console.info(`%c*** [TopAds] V4.6 ENGINE ACTIVE (#${buster}) - ULTRA SHARP FIX ***`, "color: #ffff00; font-weight: bold; font-size: 14px; background: #000; padding: 4px; border: 1px solid #ffff00;");
  console.log(`[TopAds] Fetching account: ${accountId}`);
  const time_range = JSON.stringify({ since, until });

  const insRes: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'ad_id,ad_name,spend,clicks,ctr,actions,action_values',
      time_range,
      level: 'ad',
      limit: 500,
    }, (res: any) => resolve(res));
  });

  if (!insRes || insRes.error || !insRes.data || !insRes.data.length) {
    if (insRes?.error) console.error("[TopAds] Insights error:", insRes.error);
    return [];
  }

  const sortKey = (sortBy === 'purchases' || sortBy === 'revenue' || sortBy === 'messages') ? sortBy : 'roas';
  const ads = insRes.data
    .map((d: any) => {
      const spend = parseFloat(d.spend) || 0;
      const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
      const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase');
      const messages = getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                       getAction(d.actions, 'onsite_conversion.total_messaging_connection');
      const roas = spend > 0 ? revenue / spend : 0;
      return {
        id: d.ad_id,
        name: d.ad_name || d.ad_id,
        spend,
        clicks: parseInt(d.clicks) || 0,
        purchases,
        revenue,
        messages,
        ctr: parseFloat(d.ctr) || 0,
        roas,
        thumbnail: null,
        previewUrl: null,
      };
    })
    .filter((a: any) => a.spend > 0)
    .sort((a: any, b: any) => (b[sortKey] || 0) - (a[sortKey] || 0))
    .slice(0, n);

  for (const ad of ads) {
      // BASELINE: Link garantizado a la biblioteca de anuncios (NUNCA estará vacío para el PDF)
      ad.previewUrl = `https://www.facebook.com/ads/library/?id=${ad.id}`;

      try {
        let thumb: string | null = null;
      let winningStep = "none";
      let adType = "desconocido";

      // PASO 0: Llamada inicial (v4.3 - Reforzamos campos de video y thumbnails)
      let adRes: any = await new Promise((resolve) => {
        window.FB.api(`/${ad.id}`, 'GET', {
          fields: 'creative{id,image_url,image_hash,thumbnail_url,object_story_spec,asset_feed_spec,effective_object_story_id,effective_instagram_story_id,video_id}'
        }, (res: any) => resolve(res));
      });

      if (!adRes || adRes.error) {
        adRes = await new Promise((resolve) => {
          window.FB.api(`/${ad.id}`, 'GET', { fields: 'creative{id,image_url,thumbnail_url}' }, (res: any) => resolve(res));
        });
      }

      if (adRes && !adRes.error && adRes.creative) {
        const creative = adRes.creative;
        const spec = creative.object_story_spec || {};

        // BLOQUE 1.5: Instagram Native Media (Alta prioridad para Reels / Feed IG en alta resolución nativa)
        if (!thumb && creative.effective_instagram_story_id) {
          adType = "publicacion_redes";
          const igStoryId = creative.effective_instagram_story_id;
          const igNode: any = await new Promise((resolve) => {
            window.FB.api(`/${igStoryId}`, 'GET', { fields: 'thumbnail_url,media_url,media_type,children{media_url,thumbnail_url,media_type}' }, (res: any) => resolve(res));
          });
          if (igNode && !igNode.error) {
            if (igNode.media_type === 'IMAGE') {
               thumb = igNode.media_url;
            } else if (igNode.media_type === 'CAROUSEL_ALBUM') {
               thumb = igNode.children?.data?.[0]?.media_url || igNode.media_url;
            } else if (igNode.media_type === 'VIDEO') {
               thumb = igNode.thumbnail_url || igNode.media_url;
            }
            if (!thumb && igNode.media_url) thumb = igNode.media_url;
            if (thumb) winningStep = `instagram native media node high-res (${igNode.media_type})`;
          }
        }

        // BLOQUE 1.6: Posteos de Redes / Reels (effective_object_story_id)
        if (!thumb && creative.effective_object_story_id) {
          adType = "publicacion_redes";
          const storyId = creative.effective_object_story_id;
          const storyNode: any = await new Promise((resolve) => {
            window.FB.api(`/${storyId}`, 'GET', { fields: 'full_picture,attachments{media_type,target{id},media{source,image{src,height,width}},subattachments{media_type,target{id},media{image{src,height,width}}}}' }, (res: any) => resolve(res));
          });
          
          if (storyNode && !storyNode.error) {
            let hdCandidate: string | null = null;
            let formatDetected = 'imagen';
            
            if (!hdCandidate && storyNode.attachments?.data) {
              const mainAttach = storyNode.attachments.data[0];
              if (mainAttach.media_type) formatDetected = mainAttach.media_type;
              else if (mainAttach.subattachments?.data) formatDetected = 'carousel';
              
              let targetId = null;
              const scanTarget = (it: any[]) => it.forEach(i => { if (i.target?.id && !targetId) targetId = i.target.id; if (i.subattachments?.data) scanTarget(i.subattachments.data); });
              scanTarget(storyNode.attachments.data);
              
              if (targetId) {
                 const targetNode: any = await new Promise((resolve) => {
                    window.FB.api(`/${targetId}`, 'GET', { fields: 'images,format,picture' }, (res: any) => resolve(res));
                 });
                 if (targetNode && !targetNode.error) {
                    if (targetNode.images && Array.isArray(targetNode.images)) {
                       const sortedImages = [...targetNode.images].sort((a,b) => (b.width * b.height) - (a.width * a.height));
                       hdCandidate = sortedImages[0]?.source || null;
                    } else if (targetNode.format && Array.isArray(targetNode.format)) {
                       const sortedFormat = [...targetNode.format].sort((a,b) => (b.width * b.height) - (a.width * a.height));
                       hdCandidate = sortedFormat[0]?.picture || null;
                    }
                 }
              }
            }
            
            if (!hdCandidate && storyNode.attachments?.data) {
              const allMedia: any[] = [];
              const scan = (it: any[]) => it.forEach(i => { if (i.media?.image) allMedia.push(i.media.image); if (i.subattachments?.data) scan(i.subattachments.data); });
              scan(storyNode.attachments.data);
              allMedia.sort((a, b) => (b.width * b.height) - (a.width * a.height));
              hdCandidate = allMedia[0]?.src || null;
            }

            if (!hdCandidate && creative.image_url) hdCandidate = creative.image_url;

            thumb = hdCandidate || storyNode.full_picture;
            if (thumb) winningStep = hdCandidate ? `story/reel high-res target fetch (${formatDetected})` : "story fallback full_picture";
          }
        }

        // BLOQUE 1: Videos (Búsqueda agresiva en nodo y metadata)
        if (!thumb && (creative.video_id || spec.video_data)) {
          adType = "video";
          const vidId = creative.video_id || spec.video_data?.video_id;
          // Sub-intento A: Nodo de video
          if (vidId) {
            const vidNode: any = await new Promise((resolve) => {
              window.FB.api(`/${vidId}`, 'GET', { fields: 'picture,format,thumbnail_url' }, (res: any) => resolve(res));
            });
            if (vidNode && !vidNode.error) {
              if (Array.isArray(vidNode.format)) {
                const sorted = [...vidNode.format].sort((a,b) => (b.width * b.height) - (a.width * a.height));
                thumb = sorted[0]?.picture || vidNode.picture;
              } else {
                thumb = vidNode.thumbnail_url || vidNode.picture;
              }
              if (thumb) winningStep = "video node high-res match";
            }
          }
          // Sub-intento B: Metadata del creativo (Muy común en Reels/Videos directos)
          if (!thumb) {
            const vHash = spec.video_data?.image_hash;
            if (vHash) {
              const imgNode: any = await new Promise((resolve) => {
                window.FB.api(`/${accountId}/adimages`, 'GET', { hashes: [vHash], fields: 'url' }, (res: any) => resolve(res));
              });
              if (imgNode?.data?.[0]?.url) thumb = imgNode.data[0].url;
            }
            thumb = thumb || spec.video_data?.image_url || creative.image_url || creative.thumbnail_url;
            if (thumb) winningStep = "video metadata/hash rescue";
          }
        }

        // BLOQUE 4: Anuncios Flexibles
        if (!thumb && creative.asset_feed_spec) {
          adType = "flexible";
          const afs = creative.asset_feed_spec;
          const hash = afs.images?.[0]?.hash || afs.videos?.[0]?.thumbnail_hash;
          if (hash) {
            const imgNode: any = await new Promise((resolve) => {
              window.FB.api(`/${accountId}/adimages`, 'GET', { hashes: [hash], fields: 'url' }, (res: any) => resolve(res));
            });
            thumb = imgNode?.data?.[0]?.url;
          }
          thumb = thumb || afs.images?.[0]?.url || afs.videos?.[0]?.thumbnail_url;
          if (thumb) winningStep = "asset_feed_spec scan";
        }

        // BLOQUE 5: Catálogos / DPA
        const td = creative.template_data || spec.template_data;
        if (!thumb && td) {
          adType = "catalogo";
          const firstChild = td.child_attachments?.[0];
          if (firstChild) {
            const cHash = firstChild.image_hash || spec.link_data?.image_hash;
            if (cHash) {
              const imgNode: any = await new Promise((resolve) => {
                window.FB.api(`/${accountId}/adimages`, 'GET', { hashes: [cHash], fields: 'url' }, (res: any) => resolve(res));
              });
              // Solo sobreescribimos si realmente obtuvimos una URL válida para no dejarlo en blanco
              if (imgNode?.data?.[0]?.url) {
                thumb = imgNode.data[0].url;
              }
            }
            thumb = thumb || firstChild.image_url || firstChild.picture || spec.link_data?.picture || creative.image_url;
            if (thumb) winningStep = "catalog rescue/hash stabilized";
          }
        }

        // FALLBACK 1: Imagen Estática / Manual
        if (!thumb) {
          adType = adType === "desconocido" ? "imagen_estatica" : adType;
          const hashList = [creative.image_hash, spec.photo_data?.image_hash, spec.link_data?.image_hash, spec.link_data?.child_attachments?.[0]?.image_hash].filter(Boolean);
          if (hashList.length > 0) {
            const imgNode: any = await new Promise((resolve) => {
              window.FB.api(`/${accountId}/adimages`, 'GET', { hashes: [hashList[0] as string], fields: 'url' }, (res: any) => resolve(res));
            });
            thumb = imgNode?.data?.[0]?.url;
            if (thumb) winningStep = "static hash resolution";
          }
        }

        // FALLBACK 2: Publicación de Redes Orgánica (Recuperar imagen nativa si no hubo metadata HD)
        if (!thumb && creative.effective_object_story_id) {
          adType = "publicacion_redes";
          const storyId = creative.effective_object_story_id;
          const storyNode: any = await new Promise((resolve) => {
            window.FB.api(`/${storyId}`, 'GET', { fields: 'full_picture,attachments{media{image{src,width,height}},subattachments{media{image{src,width,height}}}}' }, (res: any) => resolve(res));
          });
          
          if (storyNode && !storyNode.error) {
            // Buscamos la imagen más grande en attachments
            if (storyNode.attachments?.data) {
              const allMedia: any[] = [];
              const scan = (it: any[]) => it.forEach(i => { if (i.media?.image) allMedia.push(i.media.image); if (i.subattachments?.data) scan(i.subattachments.data); });
              scan(storyNode.attachments.data);
              allMedia.sort((a, b) => (b.width * b.height) - (a.width * a.height));
              thumb = allMedia[0]?.src || null;
            }
            if (!thumb) thumb = storyNode.full_picture;
            if (thumb) winningStep = "organic post native resolution";
          }
        }

        // FALLBACK EMERGENCIA
        if (!thumb || thumb.includes('safe_image.php')) {
          thumb = spec.link_data?.picture || spec.photo_data?.url || creative.image_url || creative.thumbnail_url;
          if (thumb) winningStep = "emergency deep fallback";
        }

        if (thumb) {
          console.log(`[TopAds][${adType.toUpperCase()}] Resolved Ad ${ad.id} via ${winningStep}`);
        }
      }

      ad.thumbnail = ensureHighResFbCdn(thumb);

      // PASO FINAL: Link de Previsualización (Aislado de la carga de imágenes para evitar bloqueos)
      try {
        const prevRes: any = await new Promise((resolve) => {
          window.FB.api(`/${ad.id}/previews`, 'GET', { ad_format: 'DESKTOP_FEED_STANDARD' }, (res: any) => resolve(res));
        });
        if (prevRes && !prevRes.error && prevRes.data?.[0]) {
          const iframeMatch = prevRes.data[0].body.match(/src="([^"]+)"/);
          if (iframeMatch) {
            ad.previewUrl = iframeMatch[1].replace(/&amp;/g, '&');
          }
        }
        // Fallback robusto a la biblioteca de anuncios si el preview de iframe falla o para asegurar link directo
        if (!ad.previewUrl) {
          ad.previewUrl = `https://www.facebook.com/ads/library/?id=${ad.id}`;
        }
      } catch (e) {
        ad.previewUrl = `https://www.facebook.com/ads/library/?id=${ad.id}`;
      }
    } catch (err) {
      console.error(`[TopAds] Error processing Ad ${ad.id}:`, err);
    }
  }

  return ads as Ad[];
}

export async function fetchAccountStructure(accountId: string): Promise<{ campaigns: Campaign[], adsets: AdSet[], ads: Ad[] }> {
  try {
    const filtering = JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]);
    const [cData, sData, aData] = await Promise.all([
      fetchAllPages(`/${accountId}/campaigns`, { fields: 'id,name,objective,status', limit: 500, filtering }),
      fetchAllPages(`/${accountId}/adsets`, { fields: 'id,name,campaign_id,status', limit: 500, filtering }),
      fetchAllPages(`/${accountId}/ads`, { fields: 'id,name,adset_id,status', limit: 500, filtering })
    ]);

    const campaigns: Campaign[] = cData.map(c => ({
      id: c.id,
      name: c.name,
      objective: c.objective,
      status: c.status,
      funnelStage: inferFunnelStage(c.name, c.objective)
    }));

    const adsets: AdSet[] = sData.map(s => ({
      id: s.id,
      name: s.name,
      campaignId: s.campaign_id,
      status: s.status
    }));

    const ads: Ad[] = aData.map(a => ({
      id: a.id,
      name: a.name,
      spend: 0, 
      purchases: 0,
      revenue: 0,
      ctr: 0,
      roas: 0,
      thumbnail: null,
      previewUrl: null,
      adsetId: a.adset_id
    }));

    return { campaigns, adsets, ads };
  } catch (err) {
    console.error("Error fetching structure:", err);
    return { campaigns: [], adsets: [], ads: [] };
  }
}

function inferFunnelStage(name: string, objective: string): 'TOFU' | 'MOFU' | 'BOFU' {
  const n = name.toUpperCase();
  
  // BOFU: Priority on explicit conversion keywords
  if (
    n.includes('BOFU') || 
    n.includes('CONVERSION') || 
    n.includes('SALES') || 
    n.includes('REMARKETING') || 
    n.includes('RETARGETING') || 
    n.includes('RMKT') || 
    n.includes('RTG') ||
    objective === 'OUTCOME_SALES'
  ) return 'BOFU';

  // MOFU: Engagement, leads and consideration
  if (
    n.includes('MOFU') || 
    n.includes('CONSIDERACION') || 
    n.includes('CONSIDERATION') || 
    n.includes('ENGAGEMENT') || 
    n.includes('INTERACCION') || 
    n.includes('LEAD') || 
    n.includes('POTENCIALES') ||
    objective === 'OUTCOME_ENGAGEMENT' || 
    objective === 'OUTCOME_LEADS'
  ) return 'MOFU';

  // TOFU: Cold traffic, awareness, prospecting
  if (
    n.includes('TOFU') || 
    n.includes('TRAFICO') || 
    n.includes('TRAFFIC') || 
    n.includes('AWARENESS') || 
    n.includes('RECONOCIMIENTO') || 
    n.includes('PROSPECTING') || 
    n.includes('LAL') || 
    n.includes('LOOKALIKE') || 
    n.includes('FRIO') ||
    objective === 'OUTCOME_AWARENESS' || 
    objective === 'OUTCOME_TRAFFIC'
  ) return 'TOFU';

  return 'TOFU'; // Default to cold traffic if unknown
}

export async function fetchDailySeries(accountId: string, since: string, until: string, adIds: string[]): Promise<Record<string, DailyMetric[]>> {
  const time_range = JSON.stringify({ since, until });
  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'ad_id,date_start,spend,clicks,actions,action_values',
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
      const messages = getAction(d.actions, 'onsite_conversion.messaging_conversation_started_7d') ||
                       getAction(d.actions, 'onsite_conversion.total_messaging_connection');
      const clicks = parseInt(d.clicks) || 0;
      const roas = spend > 0 ? revenue / spend : 0;
      const adId = d.ad_id;
      if (!byAd[adId]) byAd[adId] = [];
      byAd[adId].push({ date: d.date_start, spend, purchases, revenue, messages, clicks, roas });
    });
    Object.keys(byAd).forEach((k) => byAd[k].sort((a, b) => a.date.localeCompare(b.date)));
  }
  return byAd;
}

export async function fetchAccountDailyPerformance(accountId: string, since: string, until: string): Promise<any[]> {
  const time_range = JSON.stringify({ since, until });
  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'date_start,spend,actions,action_values',
      time_range,
      level: 'account',
      time_increment: 1,
      limit: 1000,
    }, (res: any) => resolve(res));
  });

  if (!response || response.error || !Array.isArray(response.data)) return [];

  return response.data.map((d: any) => {
    const spend = parseFloat(d.spend) || 0;
    const purchases = getAction(d.actions, 'purchase') || getAction(d.actions, 'offsite_conversion.fb_pixel_purchase');
    const revenue = getAction(d.action_values, 'purchase') || getAction(d.action_values, 'offsite_conversion.fb_pixel_purchase');
    return {
      date: d.date_start, // usually "YYYY-MM-DD"
      spend,
      purchases,
      revenue
    };
  }).sort((a: any, b: any) => a.date.localeCompare(b.date));
}

export async function fetchDemographics(accountId: string, since: string, until: string): Promise<any[]> {
  const time_range = JSON.stringify({ since, until });
  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'spend,actions,action_values',
      time_range,
      level: 'account',
      breakdowns: 'age,gender',
      limit: 1000,
    }, (res: any) => resolve(res));
  });

  if (!response || response.error || !Array.isArray(response.data)) return [];

  return response.data;
}

export async function fetchGeography(accountId: string, since: string, until: string): Promise<any[]> {
  const time_range = JSON.stringify({ since, until });
  const response: any = await new Promise((resolve) => {
    window.FB.api(`/${accountId}/insights`, 'GET', {
      fields: 'spend,actions,action_values',
      time_range,
      level: 'account',
      breakdowns: 'country',
      limit: 1000,
    }, (res: any) => resolve(res));
  });

  if (!response || response.error || !Array.isArray(response.data)) return [];

  return response.data;
}

