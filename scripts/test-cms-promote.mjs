import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {preparePromotion,finishPromotion,validatePolicy,validateEvent} from './cms-promote.mjs';

const exec=promisify(execFile);
async function git(dir,...args){return (await exec('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgSign=false','-C',dir,...args],{windowsHide:true})).stdout.trim();}
async function put(dir,name,content){const file=path.join(dir,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,content);}
async function fixture(t,siteId='dtm'){
  const root=await mkdtemp(path.join(tmpdir(),'cms-promotion-'));
  t.after(async()=>{assert.equal(path.dirname(root),tmpdir());await rm(root,{recursive:true,force:true});});
  const remote=path.join(root,'remote.git'),source=path.join(root,'source'),checkout=path.join(root,'trusted checkout');
  await mkdir(source);await exec('git',['init','--bare',remote]);await git(source,'init','--initial-branch=main');
  await git(source,'config','core.autocrlf','false');
  await git(source,'config','user.name','Synthetic');await git(source,'config','user.email','synthetic@example.invalid');
  const policy={schemaVersion:1,siteId,repository:`synthetic/${siteId}`,mainBranch:'main',ciWorkflowName:'CI',ciWorkflowPath:'.github/workflows/ci.yml'};
  const p=validatePolicy(policy,policy.repository);
  const snapshot={schemaVersion:1,[siteId==='dtm'?'siteId':'site']:siteId,revision:'synthetic-seed'};
  await put(source,p.snapshotPath,JSON.stringify(snapshot));await put(source,'README.md','trusted main\n');await put(source,'src/app.mjs','// trusted code\n');
  await git(source,'add','.');await git(source,'commit','-m','Synthetic baseline');await git(source,'remote','add','origin',remote);await git(source,'push','origin','main');
  await git(source,'branch',p.reviewBranch);await git(source,'push','origin',p.reviewBranch);
  await exec('git',['clone','--config','core.autocrlf=false','--branch','main',remote,checkout]);
  const head=await git(source,'rev-parse','HEAD');
  const event={repository:{full_name:policy.repository},workflow_run:{head_repository:{full_name:policy.repository},event:'push',head_branch:p.reviewBranch,name:'CI',path:policy.ciWorkflowPath,status:'completed',conclusion:'success',head_sha:head}};
  const options={repoDir:checkout,policy,event,repository:policy.repository,stateFile:path.join(root,'promotion.json'),allowLocalRemote:true};
  async function review(edit){await git(source,'checkout',p.reviewBranch);await edit(source,p,snapshot);await git(source,'add','.');await git(source,'commit','-m','Synthetic review');await git(source,'push','origin',p.reviewBranch);event.workflow_run.head_sha=await git(source,'rev-parse','HEAD');}
  return {root,remote,source,checkout,p,policy,snapshot,event,options,review};
}
const update=async(dir,p,snapshot)=>put(dir,p.snapshotPath,JSON.stringify({...snapshot,revision:'synthetic-next'}));

test('trusted merge promotes content for both native sites and preserves independent main changes',async t=>{
  for(const site of ['dtm','dvt'])await t.test(site,async t=>{
    const f=await fixture(t,site);
    await put(f.source,'README.md','newer trusted main\n');await git(f.source,'add','README.md');await git(f.source,'commit','-m','Main code progression');await git(f.source,'push','origin','main');
    await git(f.checkout,'pull','--ff-only');
    const bytes=Buffer.from('Synthetic raster bytes: native decoder verification belongs to actual consumer CI.');
    const hash=createHash('sha256').update(bytes).digest('hex');
    await f.review(async(dir,p,s)=>{await update(dir,p,s);await put(dir,p.mediaPrefix+hash+'.webp',bytes);});
    const prepared=await preparePromotion(f.options);assert.equal(prepared.promote,true);assert.equal(prepared.changed.length,2);
    // Workflow executes the real website checks between prepare and finish.
    const result=await finishPromotion(f.options);assert.equal(result.status,'pushed');assert.equal(result.deploymentVerified,false);
    assert.equal(await git(f.checkout,'rev-parse','HEAD^2'),f.event.workflow_run.head_sha);
    assert.equal((await readFile(path.join(f.checkout,'README.md'),'utf8')),'newer trusted main\n');
    assert.ok((await git(f.source,'ls-remote','--refs','origin','refs/heads/main')).startsWith(result.commit+'\t'));
    const again=await preparePromotion({...f.options,stateFile:path.join(f.root,'retry.json')});assert.equal(again.promote,false);assert.equal(again.reason,'already_integrated');
  });
});

test('successful CI event cannot bypass exact site/repo/workflow policy or cross-repository isolation',()=>{
  const input={schemaVersion:1,siteId:'dtm',repository:'synthetic/dtm',mainBranch:'main',ciWorkflowName:'CI',ciWorkflowPath:'.github/workflows/ci.yml'};
  const p=validatePolicy(input,input.repository);
  assert.throws(()=>validatePolicy({...input,reviewBranch:'main'},input.repository),/invalid_policy/);
  assert.throws(()=>validatePolicy(input,'synthetic/other'),/invalid_policy/);
  const event={repository:{full_name:p.repository},workflow_run:{head_repository:{full_name:p.repository},event:'push',head_branch:p.reviewBranch,name:'CI',path:p.ciWorkflowPath,status:'completed',conclusion:'success',head_sha:'a'.repeat(40)}};
  assert.equal(validateEvent(event,p),'a'.repeat(40));
  for(const change of [{event:'pull_request'},{head_branch:'main'},{conclusion:'failure'},{name:'Other'},{path:'.github/workflows/untrusted.yml'},{head_repository:{full_name:'attacker/fork'}},{head_sha:'; echo injected'}])assert.throws(()=>validateEvent({...event,workflow_run:{...event.workflow_run,...change}},p),/untrusted_ci_event/);
});

test('promotion rejects code/workflow/cross-site/unhashed assets and unsafe Git modes before merging',async t=>{
  for(const filename of ['src/app.mjs','.github/workflows/ci.yml','content/published/dvt.v1.json','public/media/content/not-a-hash.webp'])await t.test(filename,async t=>{
    const f=await fixture(t);await f.review(async dir=>put(dir,filename,'untrusted modification'));
    const before=await git(f.checkout,'rev-parse','HEAD');await assert.rejects(preparePromotion(f.options),/forbidden_changed_path/);
    assert.equal(await git(f.checkout,'rev-parse','HEAD'),before);assert.equal(await git(f.checkout,'status','--porcelain'),'');
  });
  await t.test('symlink mode',async t=>{
    const f=await fixture(t);await git(f.source,'checkout',f.p.reviewBranch);const blob=await git(f.source,'hash-object','-w','src/app.mjs');
    await git(f.source,'update-index','--cacheinfo',`120000,${blob},${f.p.snapshotPath}`);await git(f.source,'commit','-m','Synthetic unsafe mode');await git(f.source,'push','origin',f.p.reviewBranch);f.event.workflow_run.head_sha=await git(f.source,'rev-parse','HEAD');
    await assert.rejects(preparePromotion(f.options),/unsafe_file_mode/);
  });
});

test('promotion rejects stale review, conflicts, corrupt media and post-validation main/candidate races',async t=>{
  await t.test('stale review skips without mutation',async t=>{const f=await fixture(t);const old=f.event.workflow_run.head_sha;await f.review(update);f.event.workflow_run.head_sha=old;const r=await preparePromotion(f.options);assert.equal(r.reason,'superseded_review');assert.equal(await git(f.checkout,'status','--porcelain'),'');});
  await t.test('merge conflict preserves main',async t=>{
    const f=await fixture(t);await put(f.source,f.p.snapshotPath,JSON.stringify({...f.snapshot,revision:'main-change'}));await git(f.source,'add','.');await git(f.source,'commit','-m','Synthetic main content');await git(f.source,'push','origin','main');await git(f.checkout,'pull','--ff-only');
    await f.review(update);const before=await git(f.checkout,'rev-parse','HEAD');await assert.rejects(preparePromotion(f.options),/merge_conflict/);assert.equal(await git(f.checkout,'rev-parse','HEAD'),before);assert.equal(await git(f.checkout,'status','--porcelain'),'');
  });
  await t.test('corrupt hash blocks content',async t=>{const f=await fixture(t);await f.review(async(dir,p,s)=>{await update(dir,p,s);await put(dir,p.mediaPrefix+'a'.repeat(64)+'.webp','corrupt');});await assert.rejects(preparePromotion(f.options),/media_hash_mismatch/);});
  await t.test('main moved after checks cannot be overwritten',async t=>{
    const f=await fixture(t);await f.review(update);await preparePromotion(f.options);await git(f.source,'checkout','main');await put(f.source,'README.md','owner concurrent edit\n');await git(f.source,'add','.');await git(f.source,'commit','-m','Concurrent main');await git(f.source,'push','origin','main');const current=await git(f.source,'rev-parse','HEAD');await assert.rejects(finishPromotion(f.options),/remote_changed_after_validation/);assert.ok((await git(f.source,'ls-remote','--refs','origin','refs/heads/main')).startsWith(current+'\t'));
  });
  await t.test('candidate changed after checks stops',async t=>{const f=await fixture(t);await f.review(update);await preparePromotion(f.options);await put(f.checkout,'src/app.mjs','changed during test\n');await assert.rejects(finishPromotion(f.options),/candidate_changed_after_validation/);});
});
