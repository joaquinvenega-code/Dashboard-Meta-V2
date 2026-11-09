import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBlankThumbnail, resolveAdThumbnail, prepareAdImagesForPrint } from './adThumbnail';

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
