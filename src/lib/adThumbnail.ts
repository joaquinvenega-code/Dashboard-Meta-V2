type Request = (path: string, params: Record<string, unknown>) => Promise<any>;
export type ThumbnailState = 'usable' | 'blank' | 'unknown' | 'unavailable';
export type ThumbnailInspection = { state: ThumbnailState; width: number; height: number };
// About 200 dpi for the largest (~6 cm) creative in a report.
export const MIN_THUMBNAIL_EDGE = 480;
export const PRINT_THUMBNAIL_SCALE = 2;

// Reject only uniformly black/transparent images, not merely dark creatives.
export function isBlankThumbnail(pixels: ArrayLike<number>): boolean {
  if (!pixels.length) return false;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 8 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 8) return false;
  }
  return true;
}

export function inspectThumbnail(url: string): Promise<ThumbnailInspection> {
  if (typeof Image === 'undefined') return Promise.resolve({ state: 'unknown', width: 0, height: 0 });
  return new Promise(resolve => {
    const img = new Image();
    const finish = (state: ThumbnailState) => {
      clearTimeout(timer); img.onload = null; img.onerror = null;
      resolve({ state, width: img.naturalWidth, height: img.naturalHeight });
    };
    const timer = setTimeout(() => finish('unknown'), 5000);
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) return finish('unknown');
        ctx.drawImage(img, 0, 0, 32, 32);
        finish(isBlankThumbnail(ctx.getImageData(0, 0, 32, 32).data) ? 'blank' : 'usable');
      } catch { finish('unknown'); }
    };
    // Retry without CORS: even when pixel inspection is forbidden, a loaded
    // image exposes its real dimensions. Do not mistake that for a black image.
    img.onerror = () => {
      if (img.crossOrigin !== null) {
        img.crossOrigin = null;
        img.src = url;
      } else finish('unavailable');
    };
    img.src = url;
  });
}

export async function resolveAdThumbnail(
  creative: any, current: string | null, accountId: string, request: Request,
  inspect: (url: string) => Promise<ThumbnailInspection | ThumbnailState> = inspectThumbnail,
  storyVideoId?: string,
  additionalCandidates: string[] = [],
): Promise<string | null> {
  const video = creative.object_story_spec?.video_data;
  const videoId = creative.video_id || video?.video_id || creative.asset_feed_spec?.videos?.[0]?.video_id || storyVideoId;
  const candidates: string[] = [];
  const add = (url: unknown) => { if (typeof url === 'string' && url && !candidates.includes(url)) candidates.push(url); };
  const safe = async (path: string, params: Record<string, unknown>) => {
    try { return await request(path, params); } catch { return null; }
  };
  // The advertiser's cover and preferred video thumbnail precede post frames.
  const imageHash = video?.image_hash || creative.image_hash || creative.object_story_spec?.photo_data?.image_hash
    || creative.object_story_spec?.link_data?.image_hash || creative.asset_feed_spec?.images?.[0]?.hash
    || creative.asset_feed_spec?.videos?.[0]?.thumbnail_hash;
  if (imageHash) {
    const images = await safe(`/${accountId}/adimages`, { hashes: [imageHash], fields: 'url' });
    add(images?.data?.[0]?.url);
  }
  add(video?.image_url);
  if (videoId) {
    const response = await safe(`/${videoId}/thumbnails`, { fields: 'uri,is_preferred', limit: 8 });
    const frames = Array.isArray(response?.data) ? response.data : [];
    frames.filter((frame: any) => frame.is_preferred).forEach((frame: any) => add(frame.uri));
    frames.filter((frame: any) => !frame.is_preferred).forEach((frame: any) => add(frame.uri));
  }
  // Request a real larger rendition; never edit signed CDN URLs or upscale a
  // 64 px bitmap. These are AdCreative GET parameters in Meta's Business SDK.
  // https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adcreative.py
  if (creative.id) {
    const larger = await safe(`/${creative.id}`, { fields: 'thumbnail_url', thumbnail_width: 1024, thumbnail_height: 1024 });
    add(larger?.thumbnail_url);
  }
  additionalCandidates.forEach(add);
  add(current); add(creative.image_url); add(creative.thumbnail_url);
  const inspected = await Promise.all(candidates.map(async url => {
    const result = await inspect(url);
    const info = typeof result === 'string' ? { state: result, width: 0, height: 0 } : result;
    return { url, ...info };
  }));
  const available = inspected.filter(info => info.state !== 'blank' && info.state !== 'unavailable');
  const edge = (info: ThumbnailInspection) => Math.min(info.width, info.height);
  // Preserve the advertiser's preferred cover only when it is large enough.
  // A displayable HD image with CORS restrictions beats a readable 64 px one.
  return available.find(info => edge(info) >= MIN_THUMBNAIL_EDGE)?.url
    ?? available.filter(info => edge(info) > 0).sort((a, b) => edge(b) - edge(a))[0]?.url
    ?? available.find(info => info.state === 'usable')?.url
    ?? available[0]?.url ?? null;
}

export type PrintImageIssue = { index: number; reason: 'missing' | 'low_resolution'; width: number; height: number };

export async function prepareAdImagesForPrint(root: ParentNode, minimumScale = 0): Promise<PrintImageIssue[]> {
  const issues: PrintImageIssue[] = [];
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('.ad-card-print-media img')).map(async (img, index) => {
    img.loading = 'eager';
    let ready = false;
    let timer: ReturnType<typeof setTimeout>;
    await Promise.race([
      (async () => {
        // The existing onError handler may switch to the original URL.
        for (let attempt = 0; attempt < 2; attempt++) {
          try { await img.decode(); ready = img.naturalWidth > 0; if (ready) break; }
          catch { await new Promise(resolve => setTimeout(resolve, 0)); }
        }
      })(),
      new Promise(resolve => { timer = setTimeout(resolve, 6000); }),
    ]);
    clearTimeout(timer!);
    const sufficient = () => {
      if (!minimumScale) return true;
      const rect = img.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        && img.naturalWidth >= rect.width * minimumScale && img.naturalHeight >= rect.height * minimumScale;
    };
    if (!ready || !sufficient()) {
      // A distinct original URL may be sharper than the initially rendered URL.
      const original = img.getAttribute?.('data-original');
      if (original && original !== img.src) {
        img.src = original;
        let retryTimer: ReturnType<typeof setTimeout>;
        ready = await Promise.race([
          img.decode().then(() => img.naturalWidth > 0, () => false),
          new Promise<false>(resolve => { retryTimer = setTimeout(() => resolve(false), 5000); }),
        ]);
        clearTimeout(retryTimer!);
      }
    }
    if (!ready || !sufficient()) {
      const reason = ready ? 'low_resolution' : 'missing';
      issues.push({ index, reason, width: img.naturalWidth, height: img.naturalHeight });
      img.style.display = 'none';
      const placeholder = img.parentElement?.querySelector('.ad-placeholder');
      placeholder?.classList.remove('hidden');
      const label = placeholder?.querySelector?.('span');
      if (label && reason === 'low_resolution') label.textContent = 'Miniatura sin alta resolución';
    }
  }));
  return issues.sort((a, b) => a.index - b.index);
}
