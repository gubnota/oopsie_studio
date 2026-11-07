'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { StudioIcon, type StudioIconName } from '@/components/ui/brand';
import { useI18n } from '@/lib/i18n/context';

export type GenerationMode = 'image' | 'video' | 'tts' | 'music';

interface GenerationTabsProps {
    activeMode: GenerationMode;
    onModeChange: (mode: GenerationMode) => void;
}

export default function GenerationTabs({ activeMode, onModeChange }: GenerationTabsProps) {
    const { t } = useI18n();
    
    const tabs: { id: GenerationMode; labelKey: string; icon: StudioIconName }[] = [
        { id: 'image', labelKey: 'generationForm.tabs.image', icon: 'image' },
        { id: 'video', labelKey: 'generationForm.tabs.video', icon: 'video' },
        { id: 'tts', labelKey: 'generationForm.tabs.voiceover', icon: 'audio' },
        { id: 'music', labelKey: 'generationForm.tabs.music', icon: 'music' },
    ];

    return (
        <div className="grid grid-cols-4 gap-1 p-1 bg-muted/20 rounded-lg mb-4">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onModeChange(tab.id)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded-md text-xs font-medium transition-all duration-200 ${activeMode === tab.id
                            ? 'bg-muted text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                >
                    <StudioIcon name={tab.icon} className="w-4 h-4 mb-1" />
                    {t(tab.labelKey)}
                </button>
            ))}
        </div>
    );
}
