'use client';
import { StudioIcon, StudioMark } from '@/components/ui/brand';
import { workflowExamples } from '@/lib/workflows/examples';

export function WelcomeGuide({ onExample, onConnect, onEditor }: {
  onExample: (index: number) => void; onConnect: () => void; onEditor: () => void;
}) {
  return <div className="space-y-7 w-full max-w-4xl mx-auto">
    <div className="text-center"><StudioMark size={56} className="mx-auto"/><h2 className="text-4xl mt-5 mb-3">Your first happy accident.</h2><p className="studio-caption">Start tiny. Connect your compute, try a workflow, then make it yours.</p></div>
    <div className="grid md:grid-cols-2 gap-4">{workflowExamples.map((example,index)=><article className="studio-card p-5 space-y-4" key={example.id}>
      <div className="studio-preview-surface rounded-lg h-24 flex items-center justify-center"><StudioIcon name={index===0?'generate':'video'} className="w-10 h-10 text-[#7C74FF]"/></div>
      <div><h3 className="text-lg">{example.name}</h3><p className="studio-caption mt-1">{example.description}</p></div>
      <p className="studio-caption">{index===0?'Save a solid violet image to check the full workflow.':'Encode twelve violet frames with ComfyUI’s core SaveWEBM node. This is a synthetic video test.'}</p>
      <div className="flex items-center gap-4 flex-wrap"><button className="studio-upload-button" onClick={()=>onExample(index)}>Use example</button><a className="text-sm text-[#A8A2FF]" download={`oopsie-${example.id}.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(example.document,null,2))}`}>Download JSON ↓</a></div>
    </article>)}</div>
    <div className="studio-card p-5 space-y-4"><h3 className="text-lg">Connect in three steps</h3><ol className="space-y-3 text-sm text-[#C3C3D6] list-decimal pl-5">
      <li>Install <a href="https://docs.comfy.org/installation/manual_install" target="_blank" rel="noreferrer" className="text-[#A8A2FF]">ComfyUI</a> in its own environment. Start a free local CPU test:<code className="block studio-field mt-2 text-xs font-mono select-text">python main.py --cpu --listen 127.0.0.1 --port 8188</code></li>
      <li><button onClick={onConnect} className="text-[#A8A2FF]">Add a ComfyUI endpoint</button> with <code className="select-text">http://127.0.0.1:8188</code>, then test connection &amp; nodes.</li>
      <li>Use an example above, validate &amp; import, then select it and your endpoint in Generate. Saved results appear in Jobs and Library.</li>
    </ol><p className="studio-caption">The video test needs SaveWEBM and a VP9 encoder in ComfyUI. WebM playback depends on your macOS version; export MP4 from ComfyUI if needed.</p></div>
    <div className="grid md:grid-cols-2 gap-4"><div className="studio-card p-5 space-y-3"><h3 className="text-lg">Runpod, when you’re ready</h3><p className="studio-caption">Create a queue endpoint with 0 active workers, maximum 1, and the shortest idle timeout. CPU is enough for a synthetic transport test. Real AI video needs a compatible GPU worker.</p><p className="studio-caption">Startup, execution, shutdown idle time and storage can still be billed. R2 is optional for local tests.</p><a className="text-sm text-[#A8A2FF]" href="https://github.com/gubnota/oopsie_studio/blob/main/docs/SETUP.md#runpod-cheapest-serverless-test-first" target="_blank" rel="noreferrer">Oopsie setup guide ↗</a></div>
    <div className="studio-card p-5 space-y-3"><h3 className="text-lg">From a test to a real video</h3><p className="studio-caption">Run an official Wan template in ComfyUI first. Export its working API graph and import it here. Download a result, then drop the file onto your timeline.</p><div className="flex items-center gap-4 flex-wrap"><a className="text-sm text-[#A8A2FF]" href="https://docs.comfy.org/tutorials/video/wan/wan2_2" target="_blank" rel="noreferrer">Wan examples ↗</a><button className="studio-upload-button" onClick={onEditor}>Open timeline</button></div><p className="studio-caption">FLUX.3 integration is planned separately.</p></div></div>
  </div>;
}
