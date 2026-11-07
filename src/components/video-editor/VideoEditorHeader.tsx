'use client';
import React from 'react';
import { useStudio, type VideoProject } from '@/lib/context/StudioContext';
import { StudioFileInput } from '@/components/ui/StudioSelect';
import { Button } from '@/components/ui/button';
import { Download, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';
import { useMediaImport } from './useMediaImport';

export const VideoEditorHeader = React.memo(function VideoEditorHeader({ project, className }: {project: VideoProject; className?: string}) {
  const { t } = useI18n();
  const { setExportDialogOpen, keyframes } = useStudio();
  const { importFiles, importing, error } = useMediaImport(project.id);
  return <div className={cn('px-4 py-3 border-b border-border bg-background space-y-2',className)}>
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><FolderOpen className="h-4 w-4"/><span>{project.title}</span></div>
      <StudioFileInput aria-label={t('videoEditor.header.addMedia')} multiple disabled={importing} accept="image/*,video/*,audio/*,.mp4,.mov,.webm,.png,.jpg,.jpeg,.webp,.gif,.wav,.mp3,.flac,.ogg,.m4a" onChange={event=>void importFiles(Array.from(event.target.files??[]))}/>
      <Button size="sm" onClick={()=>setExportDialogOpen(true)} disabled={!Object.values(keyframes).some(frames=>frames.length)} className="gap-2"><Download className="h-4 w-4"/>{t('videoEditor.export.exportButton')}</Button>
    </div>
    {importing&&<p role="status" className="studio-caption">Importing media…</p>}
    {error&&<p role="alert" className="text-sm text-[#F0A868]">{error}</p>}
  </div>;
});
