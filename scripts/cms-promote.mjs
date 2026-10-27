// Copy this versioned helper into the website repo; execute only from trusted main.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import {readFile,writeFile,lstat,realpath,appendFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const execute=promisify(execFile);
const oid=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=code=>Object.assign(new Error(`Content promotion stopped: ${code}`),{code});
async function git(dir,args,allowFailure=false){
  try{return (await execute('git',['-c','core.hooksPath=/dev/null','-c','commit.gpgSign=false','-C',dir,...args],{env:{...process.env,GIT_TERMINAL_PROMPT:'0'},timeout:60_000,maxBuffer:4*1024*1024,windowsHide:true})).stdout;}
  catch(error){if(allowFailure&&error.code===1)return null;throw fail('git_command_failed');}
}
const value=async(dir,args)=>(await git(dir,args)).trim();

export function validatePolicy(input,repository){
  const keys=['schemaVersion','siteId','repository','mainBranch','ciWorkflowName','ciWorkflowPath'];
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).sort().join()!==keys.sort().join()||input.schemaVersion!==1||!['dtm','dvt'].includes(input.siteId)||input.repository!==repository||!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository||'')||input.mainBranch!=='main'||typeof input.ciWorkflowName!=='string'||!input.ciWorkflowName.trim()||input.ciWorkflowName.length>80||!/^\.github\/workflows\/[A-Za-z0-9_-]+\.ya?ml$/.test(input.ciWorkflowPath||''))throw fail('invalid_policy');
  return {...input,reviewBranch:`cms/content-review-${input.siteId}`,snapshotPath:`content/published/${input.siteId}.v1.json`,mediaPrefix:input.siteId==='dtm'?'public/media/content/':'public/content-media/'};
}
export function validateEvent(event,policy){
  const run=event?.workflow_run;
  if(event?.repository?.full_name!==policy.repository||run?.head_repository?.full_name!==policy.repository||run.event!=='push'||run.head_branch!==policy.reviewBranch||run.name!==policy.ciWorkflowName||run.path!==policy.ciWorkflowPath||run.status!=='completed'||run.conclusion!=='success'||!oid.test(run.head_sha||''))throw fail('untrusted_ci_event');
  return run.head_sha;
}
async function remoteRefs(dir,policy){
  const refs=[`refs/heads/${policy.mainBranch}`,`refs/heads/${policy.reviewBranch}`];
  const lines=(await git(dir,['ls-remote','--refs','origin',...refs])).trim().split('\n');
  const found={};for(const line of lines){const parts=line.split('\t');if(parts.length!==2||!oid.test(parts[0])||!refs.includes(parts[1])||found[parts[1]])throw fail('invalid_remote_refs');found[parts[1]]=parts[0];}
  if(Object.keys(found).length!==2)throw fail('missing_remote_ref');
  return {main:found[refs[0]],review:found[refs[1]]};
}
async function checkOrigin(dir,policy,allowLocalRemote){
  const remote=await value(dir,['remote','get-url','--all','origin']);
  if(remote!==await value(dir,['remote','get-url','--push','--all','origin']))throw fail('remote_mismatch');
  if(allowLocalRemote&&path.isAbsolute(remote))return;
  if(remote!==`https://github.com/${policy.repository}`&&remote!==`https://github.com/${policy.repository}.git`)throw fail('remote_mismatch');
}
function changedPaths(raw,policy){
  const parts=raw.split('\0');if(parts.pop()!=='')throw fail('invalid_git_diff');
  if(parts.length%2||parts.length>514)throw fail('change_limit');
  const files=[];
  for(let i=0;i<parts.length;i+=2){
    const match=/^:(\d{6}) (\d{6}) [a-f0-9]{40,64} [a-f0-9]{40,64} ([AMD])$/.exec(parts[i]);const filename=parts[i+1];
    if(!match||![match[1],match[2]].every(mode=>['000000','100644'].includes(mode)))throw fail('unsafe_file_mode');
    const snapshot=filename===policy.snapshotPath;
    const media=filename.startsWith(policy.mediaPrefix)&&/^[a-f0-9]{64}\.webp$/.test(filename.slice(policy.mediaPrefix.length));
    if(!snapshot&&!media||snapshot&&match[3]==='D')throw fail('forbidden_changed_path');
    files.push({filename,deleted:match[3]==='D'});
  }
  return files;
}
async function inspectFiles(dir,policy,files){
  let total=0;
  for(const file of files){
    if(file.deleted)continue;
    let current=dir;
    for(const part of file.filename.split('/')){current=path.join(current,part);const info=await lstat(current);if(info.isSymbolicLink())throw fail('unsafe_file_path');}
    const info=await lstat(current);if(!info.isFile()||info.nlink!==1)throw fail('unsafe_file_path');
    const snapshot=file.filename===policy.snapshotPath;
    if(info.size>(snapshot?2:10)*1024*1024||(total+=info.size)>66*1024*1024)throw fail('content_size_limit');
    const bytes=await readFile(current);
    if(snapshot){
      let data;try{data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail('invalid_snapshot');}
      if(data.schemaVersion!==1||data[policy.siteId==='dtm'?'siteId':'site']!==policy.siteId)throw fail('wrong_snapshot_site');
    }else if(path.basename(file.filename)!==`${sha(bytes)}.webp`)throw fail('media_hash_mismatch');
  }
}
async function saveState(filename,data){await writeFile(filename,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});}
async function loadState(filename){const info=await lstat(filename);if(!info.isFile()||info.isSymbolicLink()||info.nlink!==1||info.size>16*1024||(process.platform!=='win32'&&(info.mode&0o077)))throw fail('unsafe_state');return JSON.parse(await readFile(filename,'utf8'));}

export async function preparePromotion({repoDir,policy:input,event,repository,stateFile,allowLocalRemote=false}){
  const dir=await realpath(repoDir);const policy=validatePolicy(input,repository);const head=validateEvent(event,policy);
  if(path.relative(dir,path.resolve(stateFile)).split(path.sep)[0]!=='..')throw fail('state_inside_checkout');
  await checkOrigin(dir,policy,allowLocalRemote);
  if(await value(dir,['status','--porcelain=v1','--untracked-files=all']))throw fail('dirty_checkout');
  const refs=await remoteRefs(dir,policy);
  if(refs.review!==head)return {promote:false,reason:'superseded_review'};
  if(await value(dir,['rev-parse','HEAD'])!==refs.main)throw fail('main_changed_before_prepare');
  await git(dir,['fetch','--no-tags','origin',`refs/heads/${policy.reviewBranch}`]);
  if(await value(dir,['rev-parse','FETCH_HEAD'])!==head)throw fail('review_changed_before_prepare');
  if(await git(dir,['merge-base','--is-ancestor',head,refs.main],true)!==null)return {promote:false,reason:'already_integrated'};
  const before=changedPaths(await git(dir,['diff','--raw','-z','--no-abbrev','--no-renames',`${refs.main}...${head}`]),policy);
  if(!before.length)return {promote:false,reason:'no_content_change'};
  try{await git(dir,['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','merge','--no-commit','--no-ff','--no-edit',head]);}
  catch{await git(dir,['merge','--abort']).catch(()=>{});throw fail('merge_conflict');}
  const files=changedPaths(await git(dir,['diff','--cached','--raw','-z','--no-abbrev','--no-renames']),policy);
  await inspectFiles(dir,policy,files);
  if(!files.length){await git(dir,['merge','--abort']);return {promote:false,reason:'no_content_change'};}
  const state={schemaVersion:1,repository,siteId:policy.siteId,main:refs.main,review:head,tree:await value(dir,['write-tree']),policyHash:sha(JSON.stringify(input))};
  await saveState(stateFile,state);
  return {promote:true,main:refs.main,review:head,changed:files.map(file=>file.filename)};
}

export async function finishPromotion({repoDir,policy:input,repository,stateFile,allowLocalRemote=false}){
  const dir=await realpath(repoDir);const policy=validatePolicy(input,repository);const state=await loadState(stateFile);
  if(state.schemaVersion!==1||state.repository!==repository||state.siteId!==policy.siteId||state.policyHash!==sha(JSON.stringify(input))||![state.main,state.review,state.tree].every(v=>oid.test(v||'')))throw fail('state_mismatch');
  await checkOrigin(dir,policy,allowLocalRemote);
  const refs=await remoteRefs(dir,policy);
  if(refs.main!==state.main||refs.review!==state.review)throw fail('remote_changed_after_validation');
  if(await value(dir,['rev-parse','HEAD'])!==state.main||await value(dir,['rev-parse','MERGE_HEAD'])!==state.review||await value(dir,['write-tree'])!==state.tree||await value(dir,['diff','--name-only'])||await value(dir,['ls-files','--others','--exclude-standard']))throw fail('candidate_changed_after_validation');
  const files=changedPaths(await git(dir,['diff','--cached','--raw','-z','--no-abbrev','--no-renames']),policy);await inspectFiles(dir,policy,files);
  await git(dir,['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m',`content(${policy.siteId}): integrate validated CMS publication`]);
  const commit=await value(dir,['rev-parse','HEAD']);
  if(await value(dir,['rev-parse','HEAD^1'])!==state.main||await value(dir,['rev-parse','HEAD^2'])!==state.review||await value(dir,['rev-parse','HEAD^{tree}'])!==state.tree)throw fail('unexpected_merge_commit');
  let accepted=false;
  try{await git(dir,['push','--porcelain','origin',`${commit}:refs/heads/${policy.mainBranch}`]);accepted=true;}catch{}
  const after=await remoteRefs(dir,policy);
  if(after.main!==commit)throw fail(accepted?'main_changed_after_push':'push_unconfirmed');
  return {siteId:policy.siteId,commit,review:state.review,status:'pushed',deploymentVerified:false};
}

const main=process.argv[1]&&path.resolve(process.argv[1]).toLowerCase()===fileURLToPath(import.meta.url).toLowerCase();
if(main){
  try{
    if(process.env.GITHUB_ACTIONS!=='true'||process.env.GITHUB_EVENT_NAME!=='workflow_run')throw fail('actions_only');
    const [command,policyPath,stateFile,...extra]=process.argv.slice(2);
    if(!['prepare','finish'].includes(command)||!policyPath||!stateFile||extra.length)throw fail('invalid_arguments');
    const policy=JSON.parse(await readFile(policyPath,'utf8'));const input={repoDir:process.cwd(),policy,repository:process.env.GITHUB_REPOSITORY,stateFile};
    const result=command==='prepare'?await preparePromotion({...input,event:JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'))}):await finishPromotion(input);
    console.log(JSON.stringify(result));
    if(command==='prepare'&&process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`promote=${result.promote?'true':'false'}\n`);
    if(command==='finish'&&process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,`CMS content integrated as ${result.commit}. Cloudflare deployment is a separate Git-triggered stage; it has not been verified by this job.\n`);
  }catch(error){console.error(error.code||'promotion_failed');process.exitCode=1;}
}
