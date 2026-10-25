/** Test-only snapshots and disposable media. No production snapshot, CMS or network is used. */
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink, truncate } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Ajv from 'ajv';
import sharp from 'sharp';
import {
  ContentValidationError, validateSnapshot, validateSnapshotMedia, MAX_MEDIA_BYTES, MAX_MEDIA_PIXELS,
} from '../src/lib/content/validate.ts';

const valid = JSON.parse(await readFile(new URL('./fixtures/content/valid.json', import.meta.url), 'utf8'));
const invalid = JSON.parse(await readFile(new URL('./fixtures/content/invalid.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('../content/schema/published-snapshot.v1.schema.json', import.meta.url), 'utf8'));
const schemaCheck = new Ajv({ format: 'full', allErrors: false }).compile(schema);
const clone = value => structuredClone(value);
let cases = 0;
async function test(name, run) {
  await run();
  console.log(`ok ${++cases} - ${name}`);
}
function errorRule(run, expected) {
  assert.throws(run, error => {
    assert.ok(error instanceof ContentValidationError);
    assert.equal(error.issues.length, 1);
    assert.ok(error.issues[0].pointer.startsWith('/') || error.issues[0].pointer === '');
    if (expected) assert.ok(error.issues[0].rule.startsWith(expected), `${error.issues[0].rule} expected ${expected}`);
    return true;
  });
}
async function mediaError(snapshot, root, expected) {
  await assert.rejects(validateSnapshotMedia(validateSnapshot(snapshot), { publicRoot: root }), error => {
    assert.ok(error instanceof ContentValidationError);
    if (expected) assert.ok(error.issues[0].rule.startsWith(expected), `${error.issues[0].rule} expected ${expected}`);
    return true;
  });
}
async function rejected(name, mutate, structural = false, expected) {
  await test(name, () => {
    const candidate = clone(valid);
    mutate(candidate);
    const before = JSON.stringify(candidate);
    assert.equal(schemaCheck(candidate), !structural, 'independent public schema classification');
    errorRule(() => validateSnapshot(candidate), expected);
    assert.equal(JSON.stringify(candidate), before, 'invalid input remains unchanged');
  });
}
function link(candidate, target) { candidate.posts[0].body[0].children[1].target = target; }
function pair(candidate) {
  const vi = candidate.posts[0];
  const en = clone(vi);
  en.id = 'fixture-post-en'; en.locale = 'en'; en.slug = 'fixture-note-en';
  en.body[0].children[1].target.path = '/en/about/';
  vi.translations = [{ locale: 'en', recordId: en.id }];
  en.translations = [{ locale: 'vi', recordId: vi.id }];
  candidate.posts = [en, vi]; // IDs are the stable tie-breaker, independent of locale.
}
await test('valid published fixture validates without mutation and returns frozen copy', () => {
  const before = JSON.stringify(valid);
  const result = validateSnapshot(valid);
  assert.equal(result.posts[0].status, 'published');
  assert.equal(JSON.stringify(valid), before);
  assert.notEqual(result, valid);
  assert.ok(Object.isFrozen(result.posts[0].body[0]));
  assert.throws(() => { result.posts[0].title = 'changed'; }, TypeError);
});
await test('valid raw JSON roundtrip and legitimate zero-post state', () => {
  assert.equal(validateSnapshot(JSON.stringify(valid)).posts.length, 1);
  const empty = clone(valid);
  empty.posts = []; empty.projects = [];
  empty.settings.forEach(settings => { settings.featuredProjectIds = []; });
  assert.equal(validateSnapshot(empty).posts.length, 0);
});
await test('committed draft fixture fails closed', () => errorRule(() => validateSnapshot(invalid), 'schema.'));
for (const [name, mutate] of [
  ['draft in distributable', x => { x.posts[0].status = 'draft'; }],
  ['archived in distributable', x => { x.posts[0].status = 'archived'; }],
  ['private fields', x => { x.posts[0].privateNotes = 'do-not-print-private-value'; }],
  ['root configuration override', x => { x.baseUrl = 'https://example.com'; }],
  ['settings security override', x => { x.settings[0].contactEnabled = true; }],
  ['unknown version', x => { x.schemaVersion = 2; }],
  ['DVT site rejected by DTM validator', x => { x.siteId = 'dvt'; }],
  ['vn semantic locale rejected', x => { x.posts[0].locale = 'vn'; }],
  ['null required value', x => { x.posts[0].metadata = null; }],
  ['missing required value', x => { delete x.posts[0].body; }],
  ['title limit', x => { x.posts[0].title = 'a'.repeat(201); }],
  ['raw HTML block', x => { x.posts[0].body = [{ type: 'html', html: '<script>bad</script>' }]; }],
  ['extra block event attribute', x => { x.posts[0].body[0].onClick = 'not allowed'; }],
  ['unsafe runtime code language', x => { x.posts[0].body[4].language = 'remote-loader'; }],
  ['heading h1 forbidden', x => { x.posts[0].body[1].level = 1; }],
  ['bad calendar date', x => { x.exportedAt = '2026-02-30T00:00:00Z'; }],
  ['fractional timestamp forbidden', x => { x.exportedAt = '2026-10-26T00:00:00.000Z'; }],
  ['offset timestamp forbidden', x => { x.exportedAt = '2026-10-26T00:00:00+00:00'; }],
  ['UTC leap second forbidden', x => { x.exportedAt = '2026-10-26T00:00:60Z'; }],
  ['unsafe slug traversal', x => { x.posts[0].slug = '../note'; }],
  ['unsafe encoded slug', x => { x.posts[0].slug = 'a%2fb'; }],
]) await rejected(name, mutate, true, 'schema.');
for (const [name, mutate, rule] of [
  ['duplicate global IDs', x => { x.projects[0].id = x.posts[0].id; }, 'id.unique'],
  ['duplicate post locale/slug', x => { const p = clone(x.posts[0]); p.id = 'fixture-z-other'; p.translationGroup = 'other-group'; x.posts.push(p); }, 'slug.unique'],
  ['duplicate project locale/slug', x => { const p = clone(x.projects[0]); p.id = 'project-z-other'; p.translationGroup = 'other-group'; x.projects.push(p); }, 'slug.unique'],
  ['profile locale singleton', x => { x.profiles[1].locale = 'vi'; }, 'locale.singletons'],
  ['settings locale singleton', x => { x.settings[1].locale = 'vi'; }, 'locale.singletons'],
  ['profile locale order', x => { x.profiles.reverse(); }, 'locale.singletons'],
  ['publication later than update', x => { x.posts[0].updatedAt = '2026-10-24T00:00:00Z'; }, 'date.publicationOrder'],
  ['update later than export', x => { x.settings[0].updatedAt = '2026-10-27T00:00:00Z'; }, 'date.publicationOrder'],
  ['trimmed text', x => { x.profiles[0].name = ' name '; }, 'text.trim'],
  ['NFC text', x => { x.profiles[0].name = 'e\u0301'; }, 'text.unicode'],
  ['unpaired Unicode surrogate', x => { x.posts[0].excerpt = '\ud800'; }, 'text.unicode'],
  ['control in ordinary text', x => { x.posts[0].excerpt = 'line\rbreak'; }, 'text.control'],
  ['tab in ordinary text', x => { x.posts[0].excerpt = 'line\tbreak'; }, 'text.control'],
  ['heading jump', x => { x.posts[0].body.push({ type: 'heading', level: 4, text: 'Jump' }); }, 'block.headingOrder'],
  ['first body heading must be h2', x => { x.posts[0].body[1].level = 3; }, 'block.headingOrder'],
  ['deleted related target', x => { x.posts[0].related = [{ collection: 'projects', recordId: 'removed' }]; }, 'reference.publishedLocale'],
  ['deleted featured project', x => { x.projects = []; }, 'reference.publishedLocale'],
  ['self related target', x => { x.posts[0].related = [{ collection: 'posts', recordId: x.posts[0].id }]; }, 'reference.uniqueRelated'],
  ['duplicate related target', x => { x.posts[0].related = [1,2].map(() => ({ collection: 'projects', recordId: x.projects[0].id })); }, 'reference.uniqueRelated'],
  ['wrong-locale featured target', x => { x.settings[1].featuredProjectIds = [x.projects[0].id]; }, 'reference.publishedLocale'],
  ['dangling record link', x => { link(x, { kind: 'record', collection: 'posts', recordId: 'removed' }); }, 'reference.publishedLocale'],
  ['dangling internal path', x => { link(x, { kind: 'internal', path: '/vi/blog/removed/' }); }, 'link.internalRoute'],
  ['DVT vn route cannot leak', x => { link(x, { kind: 'internal', path: '/vn/blog/fixture-note/' }); }, 'link.internalRoute'],
  ['cross-locale internal link', x => { link(x, { kind: 'internal', path: '/en/about/' }); }, 'link.internalRoute'],
  ['unimplemented contact fixed page', x => { link(x, { kind: 'internal', path: '/vi/contact/' }); }, 'link.internalRoute'],
  ['unsorted tags', x => { x.posts[0].tags = ['z', 'a']; }, 'order.deterministic'],
]) await rejected(name, mutate, false, rule);
await test('valid code and inline whitespace remain inert and unchanged', () => {
  const candidate = clone(valid);
  candidate.posts[0].body[0].children[0].text = 'Text before a link ';
  candidate.posts[0].body[4].code = '\t<script>not executed</script>\n  text\n';
  const result = validateSnapshot(candidate);
  assert.equal(result.posts[0].body[4].code, candidate.posts[0].body[4].code);
});
await test('VI-only and reciprocal translation pair with different slugs', () => {
  assert.deepEqual(validateSnapshot(valid).posts[0].translations, []);
  const candidate = clone(valid); pair(candidate);
  assert.equal(validateSnapshot(candidate).posts.length, 2);
});
for (const [name, mutate] of [
  ['missing translation record', x => { x.posts[0].translations = [{ locale: 'en', recordId: 'missing' }]; }],
  ['removed translation with stale referrer', x => { pair(x); x.posts.shift(); }],
  ['nonreciprocal translations', x => { pair(x); x.posts[0].translations = []; }],
  ['wrong translation group', x => { pair(x); x.posts[0].translationGroup = 'other-group'; }],
  ['same-locale translation target', x => { pair(x); x.posts[0].translations = [{ locale: 'en', recordId: x.posts[0].id }]; }],
  ['wrong-collection translation target', x => { x.posts[0].translations = [{ locale: 'en', recordId: x.projects[0].id }]; }],
  ['duplicate locale within group', x => { const p = clone(x.posts[0]); p.id = 'fixture-z-other'; p.slug = 'other'; x.posts.push(p); }],
]) await rejected(name, mutate, false, 'translation.');
await test('repaired translation removal is valid singleton', () => {
  const candidate = clone(valid); pair(candidate); candidate.posts.shift(); candidate.posts[0].translations = [];
  assert.equal(validateSnapshot(candidate).posts.length, 1);
});
await test('cross-collection equal slugs are allowed and stable record links resolve', () => {
  const candidate = clone(valid); candidate.projects[0].slug = candidate.posts[0].slug;
  link(candidate, { kind: 'record', collection: 'projects', recordId: candidate.projects[0].id });
  validateSnapshot(candidate);
});
await test('trusted implemented fixed route is accepted, invalid option is rejected', () => {
  const candidate = clone(valid); link(candidate, { kind: 'internal', path: '/vi/contact/' });
  validateSnapshot(candidate, { fixedRoutes: ['/', '/vi/contact/'] });
  errorRule(() => validateSnapshot(valid, { fixedRoutes: ['/vn/'] }), 'options.fixedRoutes');
});
for (const [name, mutate] of [
  ['post timestamp descending order', x => { const p = clone(x.posts[0]); p.id = 'fixture-z-other'; p.slug = 'other'; p.translationGroup = 'other'; p.publishedAt = p.updatedAt = '2026-10-26T00:00:00Z'; x.posts.push(p); }],
  ['post stable ID tie-breaker', x => { pair(x); x.posts.reverse(); }],
  ['project numeric order', x => { const p = clone(x.projects[0]); p.id = 'project-z-other'; p.slug = 'other'; p.translationGroup = 'other'; p.order = 0; x.projects[0].order = 1; x.projects.push(p); }],
  ['project stable ID tie-breaker', x => { const p = clone(x.projects[0]); p.id = 'project-a-other'; p.slug = 'other'; p.translationGroup = 'other'; x.projects.push(p); }],
]) await rejected(name, mutate, false, 'order.deterministic');
await test('sorted ties, code-point tags and editorial featured order are deterministic', () => {
  const candidate = clone(valid); pair(candidate);
  candidate.posts[0].tags = ['a', '\ue000', '\u{10000}'];
  validateSnapshot(candidate); // Unicode code-point order differs from UTF-16 sort for the last pair.
});
for (const url of ['javascript:alert(1)','http://example.com/','https://user:pass@example.com/','https://example.com:444/','//example.com/']) {
  await rejected(`schema forbids external URL ${url}`, x => link(x, { kind: 'external', url }), true, 'schema.');
}
for (const url of ['https://localhost/','https://foo.local/','https://foo.internal/','https://intranet/','https://127.0.0.1/','https://127.1/','https://2130706433/','https://0x7f000001/','https://example.com/%0aevil','https://example.com/%5cevil','https://example.com/%ff']) {
  await rejected(`business URL restriction ${url}`, x => link(x, { kind: 'external', url }), false, 'link.external');
}
await test('approved HTTPS links need no network access', () => {
  const candidate = clone(valid); link(candidate, { kind: 'external', url: 'https://github.com/thminh176/minh-portforlio?tab=readme#top' });
  validateSnapshot(candidate);
});
for (const unsafe of ['/vi/blog/a%2fb/','/vi/blog/note/?q=1','/vi/blog/note/#x','../note','//host/note/','/vi//about/','/vi/blog/../secret/','/vi\\about/']) {
  await rejected(`unsafe internal path ${unsafe}`, x => link(x, { kind: 'internal', path: unsafe }), true, 'schema.');
}
await test('raw duplicate keys including escaped names are detected at any object', () => {
  const raw = JSON.stringify(valid);
  for (const value of [raw.replace('"siteId":"dtm"','"siteId":"dtm","siteId":"dtm"'),raw.replace('"siteId":"dtm"','"siteId":"dtm","\\u0073iteId":"dtm"'),raw.replace('"title":"Test-only note"','"title":"Test-only note","title":"hidden"')]) {
    errorRule(() => validateSnapshot(value), 'json.duplicateKey');
  }
});
await test('malformed, BOM, nonfinite, trailing and missing caller input fail', () => {
  for (const value of ['', '{', '[1,]', '{"x":NaN}', '01', '1e999', JSON.stringify(valid)+' null', '\ufeff'+JSON.stringify(valid), undefined]) errorRule(() => validateSnapshot(value));
});
await test('JSON escape handling agrees with JSON.parse on legitimate text', () => {
  const candidate = clone(valid); candidate.posts[0].body[4].code = 'quote " slash \\ braces {} [] \n\t';
  assert.equal(validateSnapshot(JSON.stringify(candidate)).posts[0].body[4].code, candidate.posts[0].body[4].code);
});
await test('cycles, accessors, sparse arrays, exotic objects and proxies fail safely', () => {
  const cyclic = clone(valid); cyclic.extra = cyclic;
  errorRule(() => validateSnapshot(cyclic), 'json.cycle');
  const accessor = clone(valid); let reads = 0;
  Object.defineProperty(accessor, 'private', { get() { reads++; return 'secret'; }, enumerable: true });
  errorRule(() => validateSnapshot(accessor), 'json.property'); assert.equal(reads, 0);
  const sparse = clone(valid); delete sparse.posts[0]; errorRule(() => validateSnapshot(sparse), 'json.array');
  errorRule(() => validateSnapshot(new Date()), 'json.object');
  errorRule(() => validateSnapshot(new Proxy({}, { ownKeys() { throw new Error('private'); } })), 'json.value');
  errorRule(() => validateSnapshot('['.repeat(66)+'0'+']'.repeat(66)), 'json.depth');
});
await test('diagnostics redact values, unknown keys, parser source and codec details', () => {
  const sentinel = 'private-value-never-logged';
  const candidate = clone(valid); candidate[sentinel] = sentinel;
  for (const input of [candidate, '{"'+sentinel+'":1,"'+sentinel+'":2}', '{"'+sentinel+'":']) {
    try { validateSnapshot(input); assert.fail('expected rejection'); }
    catch (error) { assert.ok(error instanceof ContentValidationError); assert.ok(!JSON.stringify({message:error.message,issues:error.issues}).includes(sentinel)); }
  }
});
await test('test-only editorial projection excludes drafts/archived/private state before distribution', () => {
  const post = valid.posts[0];
  const editorial = [{ state:'published', fields:post, privateNotes:'not exported' },{ state:'draft', fields:{...post,id:'fixture-draft'} },{ state:'archived', fields:{...post,id:'fixture-archived'} }];
  const publicKeys = schema.definitions.post.required.concat(['cover']);
  const projected = editorial.filter(item => item.state === 'published').map(item => Object.fromEntries(Object.entries(item.fields).filter(([key]) => publicKeys.includes(key))));
  const candidate = clone(valid); candidate.posts = projected;
  assert.equal(validateSnapshot(candidate).posts.length, 1);
  assert.ok(!JSON.stringify(projected).includes('privateNotes'));
});

const temp = await mkdtemp(path.join(os.tmpdir(), 'dtm-content-'));
try {
  const publicRoot = path.join(temp, 'public');
  const mediaRoot = path.join(publicRoot, 'media', 'content');
  await mkdir(mediaRoot, { recursive:true });
  const png = await sharp({ create:{ width:2,height:3,channels:3,background:'#b75135' } }).png().toBuffer();
  await writeFile(path.join(mediaRoot,'fixture-image.png'),png);
  const imageUse = { mediaId:'fixture-image',decorative:false,alt:'Ảnh kiểm thử màu gạch với kích thước hai nhân ba.' };
  function withMedia() {
    const candidate = clone(valid);
    candidate.media = [{ id:'fixture-image',path:'/media/content/fixture-image.png',mimeType:'image/png',width:2,height:3 }];
    candidate.posts[0].body.push({ type:'image',image:clone(imageUse) });
    return candidate;
  }
  await test('valid raster file, dimensions, signature and localized per-use alt', async () => {
    await validateSnapshotMedia(validateSnapshot(withMedia()), { publicRoot });
  });
  await test('valid decorative body image and meaningful cover/metadata', async () => {
    const candidate = withMedia();
    candidate.posts[0].body.push({ type:'image',image:{ mediaId:'fixture-image',decorative:true,alt:'' } });
    candidate.posts[0].cover = clone(imageUse); candidate.posts[0].metadata.image = clone(imageUse);
    await validateSnapshotMedia(validateSnapshot(candidate), { publicRoot });
  });
  for (const format of ['jpeg','webp','avif']) {
    await test(`existing sharp codec decodes ${format} without downloads`, async () => {
      const bytes = await sharp(png)[format]().toBuffer();
      await writeFile(path.join(mediaRoot,`fixture-image.${format}`),bytes);
      const candidate = withMedia();
      candidate.media[0].path = `/media/content/fixture-image.${format}`; candidate.media[0].mimeType = `image/${format}`;
      await validateSnapshotMedia(validateSnapshot(candidate), { publicRoot });
    });
  }
  for (const mediaPath of ['/media/content/../secret.png','/media/content/%2fsecret.png','/media/content/image.png?q=1','https://cms.example/image.png','/media/content/image.svg','/media/content/image.html','/media/content//image.png','/media/content/Image.png']) {
    await test(`schema and validator reject media path ${mediaPath}`, () => {
      const candidate = withMedia(); candidate.media[0].path = mediaPath;
      assert.equal(schemaCheck(candidate),false); errorRule(() => validateSnapshot(candidate),'schema.');
    });
  }
  for (const alt of [' ', 'fixture-image', 'fixture-image.png', 'image', 'ảnh']) {
    await test(`invalid meaningful alt ${JSON.stringify(alt)}`, () => {
      const candidate = withMedia(); candidate.posts[0].body.at(-1).image.alt = alt;
      errorRule(() => validateSnapshot(candidate));
    });
  }
  await test('missing media reference and mismatched extension/MIME fail', () => {
    const candidate = withMedia(); candidate.posts[0].body.at(-1).image.mediaId = 'missing'; errorRule(() => validateSnapshot(candidate),'reference.media');
    candidate.posts[0].body.pop(); candidate.media[0].mimeType = 'image/jpeg'; errorRule(() => validateSnapshot(candidate),'media.extension');
  });
  await test('duplicate media path, duplicate global ID and media sort fail', () => {
    const candidate = withMedia(); candidate.media.push({...candidate.media[0],id:'fixture-z-other'}); errorRule(() => validateSnapshot(candidate),'media.uniquePath');
    candidate.media[1].id = candidate.posts[0].id; errorRule(() => validateSnapshot(candidate),'id.unique');
    candidate.media[1].id = 'fixture-a-other'; candidate.media[1].path = '/media/content/other.png'; errorRule(() => validateSnapshot(candidate),'order.deterministic');
  });
  await test('unvalidated caller cannot bypass semantic validation before media', async () => {
    await assert.rejects(validateSnapshotMedia(withMedia(), {publicRoot}), error => error instanceof ContentValidationError && error.issues[0].rule === 'media.unvalidatedSnapshot');
  });
  await test('missing, case-mismatched and directory media files fail', async () => {
    const missing = withMedia(); missing.media[0].path='/media/content/missing.png'; await mediaError(missing,publicRoot,'media.exactCase');
    await writeFile(path.join(mediaRoot,'Upper.png'),png);
    const wrongCase = withMedia(); wrongCase.media[0].path='/media/content/upper.png'; await mediaError(wrongCase,publicRoot,'media.exactCase');
    await mkdir(path.join(mediaRoot,'directory.png'));
    const directory = withMedia(); directory.media[0].path='/media/content/directory.png'; await mediaError(directory,publicRoot,'media.regularFile');
  });
  await test('signature, truncated pixel stream and declared dimensions fail', async () => {
    await writeFile(path.join(mediaRoot,'bad.png'),Buffer.from('<svg>active</svg>'));
    const candidate = withMedia(); candidate.media[0].path='/media/content/bad.png'; await mediaError(candidate,publicRoot,'media.fileOrCodec');
    await writeFile(path.join(mediaRoot,'jpeg.png'),await sharp(png).jpeg().toBuffer()); candidate.media[0].path='/media/content/jpeg.png'; await mediaError(candidate,publicRoot,'media.signature');
    candidate.media[0].path='/media/content/fixture-image.png'; candidate.media[0].width=3; await mediaError(candidate,publicRoot,'media.dimensions');
    await writeFile(path.join(mediaRoot,'truncated.png'),png.subarray(0,png.length-20)); candidate.media[0].path='/media/content/truncated.png'; candidate.media[0].width=2; await mediaError(candidate,publicRoot);
  });
  await test('trusted root must be absolute existing directory', async () => {
    await mediaError(withMedia(),'relative','media.publicRoot');
    await mediaError(withMedia(),path.join(temp,'missing-root'),'media.publicRoot');
  });
  await test('symlink/junction escape and in-root link are rejected', async () => {
    const outside = path.join(temp,'outside'); await mkdir(outside); await writeFile(path.join(outside,'escaped.png'),png);
    await symlink(outside,path.join(mediaRoot,'escape'),process.platform==='win32'?'junction':'dir');
    const candidate=withMedia(); candidate.media[0].path='/media/content/escape/escaped.png'; await mediaError(candidate,publicRoot,'media.symlink');
    const inside=path.join(mediaRoot,'inside'); await mkdir(inside); await writeFile(path.join(inside,'inside.png'),png);
    await symlink(inside,path.join(mediaRoot,'internal-link'),process.platform==='win32'?'junction':'dir');
    candidate.media[0].path='/media/content/internal-link/inside.png'; await mediaError(candidate,publicRoot,'media.symlink');
  });
  await test('bounded media input bytes and decoded pixel count', async () => {
    const large=path.join(mediaRoot,'large.png'); await writeFile(large,Buffer.alloc(1)); await truncate(large,MAX_MEDIA_BYTES+1);
    const candidate=withMedia(); candidate.media[0].path='/media/content/large.png'; await mediaError(candidate,publicRoot,'media.inputLimit');
    assert.ok(MAX_MEDIA_PIXELS < 16384*16384);
    await sharp({create:{width:4097,height:4097,channels:3,background:'white'}}).png().toFile(path.join(mediaRoot,'pixels.png'));
    candidate.media[0].path='/media/content/pixels.png'; candidate.media[0].width=4097; candidate.media[0].height=4097;
    await mediaError(candidate,publicRoot); // sharp enforces its pixel limit before returning metadata.
  });
  await test('codec failure diagnostics contain no absolute path or file payload', async () => {
    const candidate=withMedia(); candidate.media[0].path='/media/content/bad.png';
    try { await validateSnapshotMedia(validateSnapshot(candidate),{publicRoot}); assert.fail('expected rejection'); }
    catch(error) { assert.ok(error instanceof ContentValidationError); assert.ok(!error.message.includes(temp)); assert.ok(!error.message.includes('<svg>')); }
  });
} finally {
  // This absolute mkdtemp directory is owned exclusively by this test; junction targets also stay inside it.
  const expectedParent=path.resolve(os.tmpdir());
  assert.equal(path.dirname(path.resolve(temp)),expectedParent);
  assert.ok(path.basename(temp).startsWith('dtm-content-'));
  await rm(temp,{recursive:true,force:true});
}
console.log(`Content snapshot validation: ${cases} cases passed; disposable media cleaned; no production data or CMS used.`);
