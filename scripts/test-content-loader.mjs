/** Isolated repo roots only. Production snapshot/source bytes are never replaced by these tests. */
import assert from 'node:assert/strict';
import { copyFile, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createContentAdapter, loadSnapshot, getProfile, getSiteSettings, getPosts, getProjects, getProject, getPost, getFeaturedProjects, getRecentPosts, getTranslationTarget } from '../src/lib/content/index.ts';
import { ContentValidationError } from '../src/lib/content/validate.ts';
import { profileConfig } from '../src/config/profile.ts';
import { siteConfig } from '../src/config/site.ts';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const productionFile = path.join(repositoryRoot, 'content', 'published', 'dtm.v1.json');
const originalBytes = await readFile(productionFile);
const initial = JSON.parse(originalBytes.toString('utf8'));
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const fixture = JSON.parse(await readFile(new URL('./fixtures/content/valid.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
let count = 0;
async function test(name, run) { await run(); console.log(`ok ${++count} - ${name}`); }
async function reject(run, rule) {
  await assert.rejects(run, error => {
    assert.ok(error instanceof ContentValidationError);
    if (rule) assert.ok(error.issues[0].rule.startsWith(rule), `${error.issues[0].rule} expected ${rule}`);
    return true;
  });
}
await test('real initial snapshot has only authentic paired projects, empty posts/media and frozen output', async () => {
  const snapshot = await loadSnapshot();
  assert.equal(snapshot.posts.length, 0); assert.equal(snapshot.media.length, 0);
  assert.equal(snapshot.projects.length, 4); assert.ok(Object.isFrozen(snapshot.projects[0].body));
  assert.deepEqual(new Set(snapshot.projects.map(record => record.sourceUrl)), new Set(['https://github.com/thminh176/mcp-project-assistant', 'https://github.com/thminh176/minh-portforlio']));
  assert.ok(!JSON.stringify(snapshot).match(/Codex|Antigravity|fixture|mcp-memory/));
});
await test('profile and Hero/settings content preserve approved sources exactly', async () => {
  const hero = (await readFile(new URL('../src/components/Hero.tsx', import.meta.url), 'utf8')).replaceAll('&apos;', "'");
  const journal = await readFile(new URL('../src/components/JournalIntro.tsx', import.meta.url), 'utf8');
  for (const language of ['vi', 'en']) {
    const profile = await getProfile(language);
    for (const [key,value] of Object.entries(profileConfig[language])) assert.deepEqual(profile[key],value);
    profile.hero.headlineLines.forEach(line => assert.ok(hero.includes(`>${line}</span>`)));
    assert.ok(hero.includes(profile.hero.kicker)); assert.ok(hero.includes(profile.hero.supporting));
    const settings = await getSiteSettings(language);
    assert.equal(settings.siteTitle, siteConfig.author[language]);
    assert.ok(journal.includes(settings.journalTitle)); assert.ok(journal.includes(settings.journalEmptyText));
    assert.ok(!('baseUrl' in settings)); assert.ok(!('isProduction' in settings));
  }
});
await test('initial project facts and technologies match the existing approved components', async () => {
  const sources = {
    'mcp-project-assistant': await readFile(new URL('../src/components/FeaturedMcpProject.tsx', import.meta.url),'utf8'),
    'personal-portfolio': await readFile(new URL('../src/components/FeaturedPortfolioProject.tsx', import.meta.url),'utf8'),
  };
  for (const project of initial.projects) {
    const source=sources[project.translationGroup];
    assert.ok(source.includes(project.title)); assert.ok(source.includes(project.summary)); assert.ok(source.includes(project.sourceUrl));
    project.technologies.forEach(technology=>assert.ok(source.includes(`<span>${technology}</span>`)));
    assert.equal(project.body[0].children[0].text,project.summary);
  }
});
await test('exact locale isolation, published lookup, paired translations and empty recent/featured selection', async () => {
  for (const language of ['vi','en']) {
    assert.deepEqual(await getPosts(language),[]); assert.deepEqual(await getRecentPosts(language),[]);
    const projects=await getProjects(language); assert.equal(projects.length,2); assert.ok(projects.every(record=>record.locale===language));
    assert.deepEqual((await getFeaturedProjects(language)).map(record=>record.id),projects.map(record=>record.id));
    for (const project of projects) {
      assert.equal((await getProject(language,project.slug)).id,project.id);
      const target=await getTranslationTarget('projects',language,project.slug,language==='vi'?'en':'vi');
      assert.equal(target.locale,language==='vi'?'en':'vi'); assert.equal(target.translationGroup,project.translationGroup);
    }
  }
  assert.equal(await getPost('vi','missing'),null); assert.equal(await getProject('vi','../bad'),null);
  assert.equal(await getProject('en','portfolio-ca-nhan'),null);
  assert.equal(await getTranslationTarget('posts','vi','missing','en'),null);
  assert.equal(await getTranslationTarget('projects','vi','mcp-project-assistant','vi'),null);
  await reject(()=>getProfile('vn'),'selector.locale');
  await reject(()=>getTranslationTarget('unknown','vi','missing','en'),'selector.collection');
});

const temp=await mkdtemp(path.join(os.tmpdir(),'dtm-loader-'));
try {
  const root=path.join(temp,'repo');
  const file=path.join(root,'content','published','dtm.v1.json');
  await mkdir(path.dirname(file),{recursive:true}); await mkdir(path.join(root,'public'),{recursive:true});
  const adapter=createContentAdapter({repositoryRoot:root});
  async function save(value=initial){ await writeFile(file,JSON.stringify(value,null,2)+'\n','utf8'); }
  await test('trusted isolated root can load a complete snapshot without application routing',async()=>{ await save(); assert.equal((await adapter.loadSnapshot()).projects.length,4); });
  await test('changed profile/settings propagate without stale read or rejected promise cache',async()=>{
    const candidate=clone(initial); candidate.profiles[0].name='Changed test profile'; candidate.settings[0].siteTitle='Changed test title';
    await save(candidate); assert.equal((await adapter.getProfile('vi')).name,candidate.profiles[0].name); assert.equal((await adapter.getSiteSettings('vi')).siteTitle,candidate.settings[0].siteTitle);
    await writeFile(file,'{malformed'); await reject(()=>adapter.loadSnapshot(),'json.syntax');
    await save(); assert.equal((await adapter.getProfile('vi')).name,initial.profiles[0].name);
  });
  await test('featured selection preserves configured order independently of project order',async()=>{
    const candidate=clone(initial); candidate.settings[0].featuredProjectIds.reverse(); await save(candidate);
    assert.deepEqual((await adapter.getFeaturedProjects('vi')).map(record=>record.id),candidate.settings[0].featuredProjectIds);
    assert.deepEqual((await adapter.getProjects('vi')).map(record=>record.order),[0,1]);
    assert.ok(Object.isFrozen(await adapter.getFeaturedProjects('vi')));
  });
  await test('recent post ordering/ties, locale filtering, limit and zero limit',async()=>{
    const candidate=clone(initial);
    candidate.posts=[['post-c-vi','vi','03'],['post-a-en','en','02'],['post-a-vi','vi','02'],['post-b-vi','vi','02']].map(([id,language,hour])=>{
      const post=clone(fixture.posts[0]); post.id=id; post.locale=language; post.slug=id; post.translationGroup=id;
      post.publishedAt=post.updatedAt=`2026-10-25T${hour}:00:00Z`; post.body[0].children[1].target.path=`/${language}/about/`; return post;
    });
    candidate.settings[0].recentPostLimit=2; await save(candidate);
    assert.deepEqual((await adapter.getRecentPosts('vi')).map(record=>record.id),['post-c-vi','post-a-vi']);
    assert.deepEqual((await adapter.getRecentPosts('en')).map(record=>record.id),['post-a-en']);
    assert.equal((await adapter.getPost('vi','post-c-vi')).locale,'vi'); assert.equal(await adapter.getPost('en','post-c-vi'),null);
    assert.equal(await adapter.getTranslationTarget('posts','vi','post-c-vi','en'),null);
    candidate.settings[0].recentPostLimit=0; await save(candidate); assert.deepEqual(await adapter.getRecentPosts('vi'),[]);
  });
  await test('missing translation remains absent after repaired complete replacement',async()=>{
    const candidate=clone(initial); const removed='project-mcp-en';
    candidate.projects=candidate.projects.filter(record=>record.id!==removed);
    candidate.projects.find(record=>record.id==='project-mcp-vi').translations=[];
    candidate.settings[1].featuredProjectIds=candidate.settings[1].featuredProjectIds.filter(id=>id!==removed);
    await save(candidate);
    assert.equal(await adapter.getProject('en','mcp-project-assistant'),null);
    assert.equal(await adapter.getTranslationTarget('projects','vi','mcp-project-assistant','en'),null);
    assert.equal((await adapter.getProjects('en')).length,1);
  });
  await test('removed referrers and draft snapshots fail whole selector before any public projection',async()=>{
    const candidate=clone(initial); candidate.projects.pop(); await save(candidate); await reject(()=>adapter.getProfile('vi'),'translation.');
    await save(fixture); const draft=clone(fixture); draft.posts[0].status='draft'; await save(draft); await reject(()=>adapter.getProjects('vi'),'schema.');
  });
  await test('missing, duplicate-key, BOM and invalid UTF-8 files fail without stale fallback',async()=>{
    await rm(file); await reject(()=>adapter.loadSnapshot(),'loader.');
    await writeFile(file,'{"schemaVersion":1,"schemaVersion":1}'); await reject(()=>adapter.loadSnapshot(),'json.duplicateKey');
    await writeFile(file,'\ufeff'+JSON.stringify(initial)); await reject(()=>adapter.loadSnapshot(),'json.bom');
    await writeFile(file,Buffer.from([0xff,0xfe])); await reject(()=>adapter.loadSnapshot(),'loader.read');
    await save(); assert.equal((await adapter.loadSnapshot()).posts.length,0);
  });
  await test('all selectors await real media validation, including unused media inventory',async()=>{
    const candidate=clone(initial); candidate.media=[{id:'test-image',path:'/media/content/test-image.png',mimeType:'image/png',width:2,height:3}];
    await save(candidate); await reject(()=>adapter.getProfile('vi'),'media.');
    const mediaRoot=path.join(root,'public','media','content'); await mkdir(mediaRoot,{recursive:true});
    await sharp({create:{width:2,height:3,channels:3,background:'white'}}).png().toFile(path.join(mediaRoot,'test-image.png'));
    assert.equal((await adapter.loadSnapshot()).media.length,1);
    candidate.media[0].width=3; await save(candidate); await reject(()=>adapter.getSiteSettings('en'),'media.dimensions');
    await save(); assert.equal((await adapter.loadSnapshot()).media.length,0);
  });
  await test('native read failures and bad values are redacted from adapter errors',async()=>{
    const sentinel='private-value-not-for-errors';
    const missing=createContentAdapter({repositoryRoot:path.join(temp,sentinel)});
    for(const run of [()=>missing.loadSnapshot(),async()=>{await writeFile(file,'{"private":"'+sentinel+'"');return adapter.loadSnapshot();}]){
      await assert.rejects(run,error=>error instanceof ContentValidationError&&!error.message.includes(sentinel)&&!error.message.includes(temp));
    }
    assert.throws(()=>createContentAdapter({repositoryRoot:'relative'}),ContentValidationError);
  });
  await test('CLI accepts only explicit trusted root options and rejects invalid temp candidates',async()=>{
    await save();
    const cli=fileURLToPath(new URL('./validate-content.mjs',import.meta.url));
    const run=(args)=>spawnSync(process.execPath,['--experimental-strip-types',cli,...args],{encoding:'utf8'});
    assert.equal(run(['--repo-root',root]).status,0);
    await writeFile(file,'{bad'); const result=run(['--repo-root',root]); assert.equal(result.status,1); assert.ok(result.stderr.includes('json.syntax')); assert.ok(!result.stderr.includes(root));
    const badArgs=run(['--unknown','private-value']); assert.equal(badArgs.status,1); assert.ok(badArgs.stderr.includes('cli.arguments')); assert.ok(!badArgs.stderr.includes('private-value'));
  });
  await test('exact validate:content and build gate reject staged draft before Next command',async()=>{
    assert.equal(manifest.scripts.build,`${manifest.scripts['validate:content']} && next build && node scripts/normalize-static-export.mjs`);
    const stage=path.join(temp,'gate');
    for(const relative of ['src/lib/content/index.ts','src/lib/content/types.ts','src/lib/content/validate.ts','content/schema/published-snapshot.v1.schema.json','scripts/validate-content.mjs','package.json']){
      const destination=path.join(stage,relative); await mkdir(path.dirname(destination),{recursive:true}); await copyFile(path.join(repositoryRoot,relative),destination);
    }
    await mkdir(path.join(stage,'public')); await mkdir(path.join(stage,'content','published'),{recursive:true});
    const draft=clone(fixture); draft.posts[0].status='draft'; await writeFile(path.join(stage,'content','published','dtm.v1.json'),JSON.stringify(draft));
    await mkdir(path.join(stage,'node_modules'));
    for(const dependency of ['ajv','sharp'])await symlink(await realpath(path.join(repositoryRoot,'node_modules',dependency)),path.join(stage,'node_modules',dependency),process.platform==='win32'?'junction':'dir');
    const bin=path.join(stage,'bin'); await mkdir(bin);
    const markerScript="require('node:fs').writeFileSync(require('node:path').join(process.cwd(),'next-ran'),'called');\n";
    if(process.platform==='win32'){
      await writeFile(path.join(bin,'next-marker.cjs'),markerScript); await writeFile(path.join(bin,'next.cmd'),'@echo off\r\nnode "%~dp0next-marker.cjs"\r\n');
    }else await writeFile(path.join(bin,'next'),'#!/usr/bin/env node\n'+markerScript,{mode:0o755});
    const env={...process.env,PATH:bin+path.delimiter+process.env.PATH};
    const execute=command=>spawnSync(command,{cwd:stage,env,shell:true,encoding:'utf8'});
    const positiveControl=execute('next'); assert.equal(positiveControl.status,0,positiveControl.stderr); await access(path.join(stage,'next-ran')); await rm(path.join(stage,'next-ran'));
    const cliResult=execute(manifest.scripts['validate:content']); assert.equal(cliResult.status,1); assert.ok(cliResult.stderr.includes('schema.const'));
    const gate=execute(manifest.scripts.build); assert.equal(gate.status,1); assert.ok(gate.stderr.includes('schema.const'));
    await assert.rejects(access(path.join(stage,'next-ran')));
    console.log(`GATE_EVIDENCE ${JSON.stringify({command:manifest.scripts.build,cliExit:cliResult.status,buildExit:gate.status,nextInvoked:false,isolatedRoot:true})}`);
  });
}finally{
  assert.equal(path.dirname(path.resolve(temp)),path.resolve(os.tmpdir()));
  assert.ok(path.basename(temp).startsWith('dtm-loader-'));
  // This owned temp root is verified above; rm removes directory links without traversing their targets.
  await rm(temp,{recursive:true,force:true});
  assert.deepEqual(await readFile(productionFile),originalBytes,'production snapshot bytes unchanged');
}
console.log(`Content loader: ${count} cases passed; temp roots cleaned; production snapshot preserved.`);
