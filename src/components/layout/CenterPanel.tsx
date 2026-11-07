'use client';
import React from 'react';
import { useStudio } from '@/lib/context/StudioContext';
import { VideoEditorView } from '@/components/video-editor/VideoEditorView';
import { StudioIcon } from '@/components/ui/brand';
export default function CenterPanel() {
  const { activeArtifactId, activeTool, jobs, workspaceMedia, currentProject, projects, createProject, loadProject } = useStudio();
  if (activeTool === 'speech-sequencer') return currentProject ? <VideoEditorView projectId={currentProject.id} /> : <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-background"><StudioIcon name="workflows" className="w-12 h-12 text-[#7C74FF]"/><h2 className="text-2xl">Your next story starts here.</h2><button className="rounded-lg bg-primary px-4 py-2" onClick={() => createProject({title:'Untitled project',description:'',aspectRatio:'16:9',width:1280,height:720,duration:30000})}>Create a video project</button>{projects.map(project => <button key={project.id} onClick={() => loadProject(project.id)} className="text-[#A8A2FF]">Open {project.title}</button>)}</div>;
  const job = jobs.find(item => item.id === activeArtifactId);
  const media = workspaceMedia.find(item => item.id === activeArtifactId);
  const url = media?.url || job?.resultUrl, type = media?.type || job?.type;
  return <div className="flex min-w-0 flex-1 flex-col bg-background"><header className="flex justify-between p-4 border-b border-border"><h2>Preview</h2>{url && <a href={url} download>Download original</a>}</header><div className="studio-preview-surface flex min-h-0 flex-1 items-center justify-center p-6">{url ? type === 'image' ? <img src={url} alt={media?.prompt || job?.prompt || 'Generated image'} className="studio-media-preview max-h-full max-w-full rounded-xl" /> : ['audio','tts','music'].includes(type || '') ? <audio controls src={url} /> : <video controls src={url} className="studio-media-preview max-h-full max-w-full rounded-xl" /> : <div className="text-center text-muted-foreground"><StudioIcon name="generate" className="w-12 h-12 mx-auto mb-5 text-[#7C74FF]"/><h2 className="text-2xl text-foreground mb-2">Make room for a happy accident.</h2><p>Select a saved result to preview it here.</p></div>}</div></div>;
}
