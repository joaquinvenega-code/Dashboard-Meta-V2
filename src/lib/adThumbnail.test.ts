import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectThumbnail, isBlankThumbnail, resolveAdThumbnail, prepareAdImagesForPrint } from './adThumbnail';

test('rejects solid black and transparent frames, retains dark pictures with content', () => {
  assert.equal(isBlankThumbnail([0, 0, 0, 255, 0, 0, 0, 255]), true);
  assert.equal(isBlankThumbnail([255, 255, 255, 0]), true);
  assert.equal(isBlankThumbnail([0, 0, 0, 255, 12, 15, 20, 255]), false);
});

test('replaces a black post image and black preferred cover with a usable video frame', async () => {
  const calls: string[] = [];
  const result = await resolveAdThumbnail({ video_id: 'video-1' }, 'black-post', 'act_1', async path => {
    calls.push(path);
    return { data: [{ uri: 'good-frame' }, { uri: 'black-cover', is_preferred: true }] };
  }, async url => url.startsWith('black') ? 'blank' : 'usable');
  assert.equal(result, 'good-frame');
  assert.deepEqual(calls, ['/video-1/thumbnails']);
});

test('prefers the explicitly selected cover over generic post frames', async () => {
  const result = await resolveAdThumbnail({ object_story_spec: { video_data: { image_url: 'cover', video_id: '1' } } }, 'post', 'act_1', async () => ({ data: [{ uri: 'frame' }] }), async () => 'usable');
  assert.equal(result, 'cover');
});

test('permission errors and CORS restrictions preserve displayable fallback URLs', async () => {
  const result = await resolveAdThumbnail({ video_id: '1' }, 'fallback', 'act_1', async () => { throw new Error('permission'); }, async () => 'unknown');
  assert.equal(result, 'fallback');
});

test('all black candidates produce the existing missing-image placeholder', async () => {
  assert.equal(await resolveAdThumbnail({ thumbnail_url: 'black' }, 'black', 'act_1', async () => null, async () => 'blank'), null);
});

test('a 64 px selected cover cannot displace an available HD video frame', async () => {
  const result = await resolveAdThumbnail(
    { object_story_spec: { video_data: { image_url: 'small-cover', video_id: '1' } } }, 'post', 'act_1',
    async () => ({ data: [{ uri: 'hd-frame', is_preferred: true }] }),
    async url => ({ state: 'usable', width: url === 'hd-frame' ? 1080 : 64, height: url === 'hd-frame' ? 1920 : 64 }),
  );
  assert.equal(result, 'hd-frame');
});

test('a sufficiently sharp selected cover retains priority over larger generic frames', async () => {
  const result = await resolveAdThumbnail(
    { object_story_spec: { video_data: { image_url: 'cover', video_id: '1' } } }, 'post', 'act_1',
    async () => ({ data: [{ uri: 'frame' }] }),
    async url => ({ state: 'usable', width: url === 'cover' ? 600 : 1080, height: url === 'cover' ? 600 : 1920 }),
  );
  assert.equal(result, 'cover');
});

test('requests a larger creative rendition through Meta instead of rewriting CDN signatures', async () => {
  const signed = 'https://cdn.example/cover.jpg?signature=keep-this';
  const result = await resolveAdThumbnail({ id: 'creative-1', thumbnail_url: 'small' }, 'small', 'act_1', async (path, params) => {
    assert.equal(path, '/creative-1');
    assert.deepEqual(params, { fields: 'thumbnail_url', thumbnail_width: 1024, thumbnail_height: 1024 });
    return { thumbnail_url: signed };
  }, async url => ({ state: 'usable', width: url === signed ? 1024 : 64, height: url === signed ? 1024 : 64 }));
  assert.equal(result, signed);
});

test('a displayable HD attachment wins even when CORS prevents pixel inspection', async () => {
  const result = await resolveAdThumbnail({ thumbnail_url: 'small' }, 'small', 'act_1', async () => null,
    async url => url === 'attachment' ? { state: 'unknown', width: 1080, height: 1920 } : { state: 'usable', width: 64, height: 64 },
    undefined, ['attachment']);
  assert.equal(result, 'attachment');
});

test('keeps the best available small fallback but excludes broken and black HD images', async () => {
  const dimensions = { small: 64, medium: 320, black: 1080, broken: 1080 };
  const result = await resolveAdThumbnail({ thumbnail_url: 'small', image_url: 'medium' }, 'black', 'act_1', async () => null,
    async url => ({ state: url === 'black' ? 'blank' : url === 'broken' ? 'unavailable' : 'usable', width: dimensions[url], height: dimensions[url] }),
    undefined, ['broken']);
  assert.equal(result, 'medium');
});

test('CORS fallback measures actual dimensions without requiring access to pixels', async t => {
  const oldImage = Object.getOwnPropertyDescriptor(globalThis, 'Image');
  class DisplayOnlyImage {
    crossOrigin: string | null = null;
    naturalWidth = 0;
    naturalHeight = 0;
    onload?: () => void;
    onerror?: () => void;
    set src(_url: string) {
      queueMicrotask(() => {
        if (this.crossOrigin) this.onerror?.();
        else { this.naturalWidth = 720; this.naturalHeight = 1280; this.onload?.(); }
      });
    }
  }
  Object.defineProperty(globalThis, 'Image', { configurable: true, value: DisplayOnlyImage });
  t.after(() => { if (oldImage) Object.defineProperty(globalThis, 'Image', oldImage); else Reflect.deleteProperty(globalThis, 'Image'); });
  // No document/canvas in Node: inspection becomes unknown, dimensions survive.
  assert.deepEqual(await inspectThumbnail('display-only'), { state: 'unknown', width: 720, height: 1280 });
});

test('print rejects upscaled previews, retries originals, and preserves sharp images', async () => {
  const image = (width: number, height: number, original?: string) => {
    const label = { textContent: '' };
    const placeholder = { hidden: true, classList: { remove() { placeholder.hidden = false; } }, querySelector: () => label };
    const img = { loading: 'lazy', src: 'preview', naturalWidth: width, naturalHeight: height,
      style: { display: '' }, getBoundingClientRect: () => ({ width: 144, height: 180 }),
      getAttribute: () => original, parentElement: { querySelector: () => placeholder },
      async decode() { if (img.src === 'original') { img.naturalWidth = 720; img.naturalHeight = 1280; } },
    };
    return { img, placeholder, label };
  };
  const low = image(64, 64), retry = image(64, 64, 'original'), high = image(600, 600);
  const issues = await prepareAdImagesForPrint({ querySelectorAll: () => [low.img, retry.img, high.img] } as unknown as ParentNode, 2);
  assert.deepEqual(issues, [{ index: 0, reason: 'low_resolution', width: 64, height: 64 }]);
  assert.equal(low.img.style.display, 'none');
  assert.equal(low.placeholder.hidden, false);
  assert.match(low.label.textContent, /alta resolución/);
  assert.equal(retry.img.src, 'original');
  assert.equal(retry.img.style.display, '');
  assert.equal(high.img.style.display, '');
});

test('print waits for image decoding and reveals the fallback for broken images', async () => {
  let release!: () => void;
  let placeholder = false;
  const good = { loading: 'lazy', naturalWidth: 100, decode: () => new Promise<void>(r => { release = r; }), style: {} };
  const broken = { loading: 'lazy', naturalWidth: 0, decode: async () => { throw new Error('broken'); }, style: { display: '' }, parentElement: { querySelector: () => ({ classList: { remove: () => { placeholder = true; } } }) } };
  let done = false;
  const pending = prepareAdImagesForPrint({ querySelectorAll: () => [good, broken] } as unknown as ParentNode).then(() => { done = true; });
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(done, false);
  assert.equal(good.loading, 'eager');
  release(); await pending;
  assert.equal(broken.style.display, 'none');
  assert.equal(placeholder, true);
});
