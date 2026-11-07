'use client';
import React, {useState} from 'react';
import {StudioFileInput} from '@/components/ui/StudioSelect';
export function StorageBrowser() {
  const [prefix,setPrefix]=useState(''), [files,setFiles]=useState<any[]>([]), [folders,setFolders]=useState<any[]>([]);
  const [busy,setBusy]=useState(false), [error,setError]=useState(''), [loaded,setLoaded]=useState(false), [token,setToken]=useState('');
  async function list(path=prefix, next='') {
    const response=await fetch(`/api/s3-storage/files?prefix=${encodeURIComponent(path)}${next?`&continuationToken=${encodeURIComponent(next)}`:''}`);
    const data=await response.json(); if(!response.ok)throw new Error(data.error||'Could not open storage');
    setFiles(old=>next?[...old,...data.files]:data.files||[]);setFolders(old=>next?[...old,...data.folders]:data.folders||[]);setToken(data.nextContinuationToken||'');setPrefix(path);setLoaded(true);
  }
  async function work(task:()=>Promise<void>) {setBusy(true);setError('');try{await task();}catch(e){setError(e instanceof Error?e.message:'Storage request failed');}finally{setBusy(false);}}
  const button='rounded-lg border border-border bg-secondary px-4 py-2 text-sm hover:bg-muted disabled:opacity-40';
  return <div className="studio-card p-6 space-y-4">
    <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl">Cloudflare R2</h2><p className="studio-caption">Browse your configured private bucket. Files open using links valid for 15 minutes.</p></div><button className={button} disabled={busy} onClick={()=>void work(()=>list())}>{busy?'Working…':loaded?'Refresh':'Open bucket'}</button></div>
    <div className="flex gap-3"><input aria-label="Storage folder prefix" className="studio-field flex-1" placeholder="Folder prefix" value={prefix} onChange={e=>setPrefix(e.target.value)}/><button className={button} disabled={busy} onClick={()=>void work(()=>list())}>Browse</button></div>
    <StudioFileInput aria-label="Upload to R2" disabled={busy} onChange={e=>{const file=e.target.files?.[0];if(file)void work(async()=>{const form=new FormData();form.append('file',file);form.append('prefix',prefix);const r=await fetch('/api/s3-storage/upload',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw new Error(d.error||'Upload failed');await list();});}}/>
    {error&&<p role="alert" className="text-red-300 text-sm">{error}</p>}
    <div className="divide-y divide-border">{folders.map(folder=><button key={folder.key} className="block w-full text-left py-3 text-[#A8A2FF]" disabled={busy} onClick={()=>void work(()=>list(folder.key))}>↳ {folder.name||folder.key}</button>)}{files.filter(file=>!file.isDirectory).map(file=><div key={file.key} className="flex items-center gap-4 py-3"><span className="flex-1 truncate">{file.name||file.key}</span><span className="studio-caption">{(file.size/1024).toFixed(1)} KB</span><button className={button} disabled={busy} onClick={()=>void work(async()=>{const r=await fetch('/api/download',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:file.url,filename:file.name||file.key.split('/').pop()})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Download failed');if(window.__TAURI__){const reveal=await fetch('/api/native/reveal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:d.path})});if(!reveal.ok)throw new Error('Could not reveal downloaded file');}else{const a=document.createElement('a');a.href=d.path;a.download=file.name;a.click();}})}>Save media locally</button></div>)}</div>
    {loaded&&!files.length&&!folders.length&&<p className="studio-caption">This folder is empty.</p>}
    {token&&<button className={button} disabled={busy} onClick={()=>void work(()=>list(prefix,token))}>Load more</button>}
  </div>;
}
