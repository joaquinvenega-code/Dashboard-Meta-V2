type Request = (path: string, params: Record<string, unknown>) => Promise<any>;
export type ThumbnailState = 'usable' | 'blank' | 'unknown';

// Reject only uniformly black/transparent images, not merely dark creatives.
export function isBlankThumbnail(pixels: ArrayLike<number>): boolean {
  if (!pixels.length) return false;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] > 8 && Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) > 8) return false;
  }
  return true;
}

export function inspectThumbnail(url: string): Promise<ThumbnailState> {
  if (typeof Image === 'undefined') return Promise.resolve('unknown');
  return new Promise(resolve => {
    const img = new Image();
    const finish = (state: ThumbnailState) => {
      clearTimeout(timer); img.onload = null; img.onerror = null; resolve(state);
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
    // A CDN may allow display but forbid pixel inspection. Keep that URL as a
    // last resort instead of mistaking a CORS restriction for a black image.
    img.onerror = () => finish('unknown');
    img.src = url;
  });
}

export async function resolveAdThumbnail(
  creative: any, current: string | null, accountId: string, request: Request,
  inspect: (url: string) => Promise<ThumbnailState> = inspectThumbnail,
  storyVideoId?: string,
): Promise<string | null> {
  const video = creative.object_story_spec?.video_data;
  const videoId = creative.video_id || video?.video_id || creative.asset_feed_spec?.videos?.[0]?.video_id || storyVideoId;
  const candidates: string[] = [];
  const add = (url: unknown) => { if (typeof url === 'string' && url && !candidates.includes(url)) candidates.push(url); };
  const safe = async (path: string, params: Record<string, unknown>) => {
    try { return await request(path, params); } catch { return null; }
  };
  // The advertiser's cover and preferred video thumbnail precede post frames.
  if (video?.image_hash) {
    const images = await safe(`/${accountId}/adimages`, { hashes: [video.image_hash], fields: 'url' });
    add(images?.data?.[0]?.url);
  }
  add(video?.image_url);
  if (videoId) {
    const response = await safe(`/${videoId}/thumbnails`, { fields: 'uri,is_preferred', limit: 8 });
    const frames = Array.isArray(response?.data) ? response.data : [];
    frames.filter((frame: any) => frame.is_preferred).forEach((frame: any) => add(frame.uri));
    frames.filter((frame: any) => !frame.is_preferred).forEach((frame: any) => add(frame.uri));
  }
  add(current); add(creative.image_url); add(creative.thumbnail_url);
  const states = await Promise.all(candidates.map(url => inspect(url)));
  return candidates.find((_, i) => states[i] === 'usable')
    ?? candidates.find((_, i) => states[i] === 'unknown') ?? null;
}

export async function prepareAdImagesForPrint(root: ParentNode): Promise<void> {
  await Promise.all(Array.from(root.querySelectorAll<HTMLImageElement>('.ad-card-print-media img')).map(async img => {
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
    if (!ready) {
      img.style.display = 'none';
      img.parentElement?.querySelector('.ad-placeholder')?.classList.remove('hidden');
    }
  }));
}
