'use client';

import React, { useState } from 'react';
import { StudioMark, StudioWordmark, StudioIcon } from '@/components/ui/brand';
import { useStudio } from '@/lib/context/StudioContext';
import { CogIcon } from '@heroicons/react/24/outline';
import VideoGenerationForm from '../forms/VideoGenerationForm';
import ImageGenerationForm from '../forms/ImageGenerationForm';
import AudioGenerationForm from '../forms/AudioGenerationForm';
import MusicGenerationForm from '../forms/MusicGenerationForm';
import GenerationTabs, { GenerationMode } from '../forms/GenerationTabs';
import SettingsDialog from '../settings/SettingsDialog';

// Simple icons for social media

const GithubIcon = ({ className }: { className?: string }) => (
    <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
);


export default function LeftPanel() {
    const { activeTool, setActiveTool } = useStudio();
    const [generationMode, setGenerationMode] = useState<GenerationMode>('image');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Listen for job reuse events and switch to appropriate tab
    React.useEffect(() => {
        const handleReuseInput = (event: CustomEvent) => {
            const { type, _redispatched } = event.detail;

            // Ignore re-dispatched events to prevent infinite loop
            if (_redispatched) {
                return;
            }

            console.log('🎯 LeftPanel received reuseJobInput event, type:', type);

            if (type === 'video') {
                setGenerationMode('video');
                // Re-dispatch event after tab switch to ensure form is mounted
                setTimeout(() => {
                    console.log('🔄 Re-dispatching event after tab switch');
                    window.dispatchEvent(new CustomEvent('reuseJobInput', {
                        detail: { ...event.detail, _redispatched: true }
                    }));
                }, 150);
            } else if (type === 'image') {
                setGenerationMode('image');
                // Re-dispatch event after tab switch to ensure form is mounted
                setTimeout(() => {
                    console.log('🔄 Re-dispatching event after tab switch');
                    window.dispatchEvent(new CustomEvent('reuseJobInput', {
                        detail: { ...event.detail, _redispatched: true }
                    }));
                }, 150);
            } else if (type === 'music') {
                setGenerationMode('music');
                // Re-dispatch event after tab switch to ensure form is mounted
                setTimeout(() => {
                    console.log('🔄 Re-dispatching event after tab switch');
                    window.dispatchEvent(new CustomEvent('reuseJobInput', {
                        detail: { ...event.detail, _redispatched: true }
                    }));
                }, 150);
            } else if (type === 'audio' || type === 'tts') {
                setGenerationMode('tts');
                // Re-dispatch event after tab switch to ensure form is mounted
                setTimeout(() => {
                    console.log('🔄 Re-dispatching event after tab switch');
                    window.dispatchEvent(new CustomEvent('reuseJobInput', {
                        detail: { ...event.detail, _redispatched: true }
                    }));
                }, 150);
            }
        };

        window.addEventListener('reuseJobInput', handleReuseInput as any);
        return () => window.removeEventListener('reuseJobInput', handleReuseInput as any);
    }, []);

    return (
        <div className="flex h-full border-r border-border bg-card">
            {/* Form Area */}
            <div className="w-[340px] flex flex-col overflow-hidden flex-shrink-0">
                {/* Header with Logo, Socials, and Settings */}
                <div className="p-4 border-b border-border flex items-center justify-between gap-3 bg-muted/10">
                    <div className="flex items-center gap-2">
                        <StudioMark />
                        <StudioWordmark />
                    </div>

                    <div className="flex items-center gap-2">
                        <a href="https://github.com/gubnota/oopsie_studio" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="GitHub">
                            <GithubIcon className="w-5 h-5" />
                        </a>
                        <div className="w-px h-4 bg-border mx-1"></div>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors"
                            title="Settings"
                        >
                            <StudioIcon name="settings" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <GenerationTabs activeMode={generationMode} onModeChange={setGenerationMode} />
                    {generationMode === 'image' && <ImageGenerationForm />}
                    {generationMode === 'video' && <VideoGenerationForm />}
                    {generationMode === 'tts' && <AudioGenerationForm />}
                    {generationMode === 'music' && <MusicGenerationForm />}
                </div>
            </div>

            <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}
