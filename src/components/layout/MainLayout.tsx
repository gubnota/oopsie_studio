'use client';
import React from 'react';
import { StudioProvider } from '@/lib/context/StudioContext';
import StudioShell from './StudioShell';
export default function MainLayout() { return <StudioProvider><StudioShell/></StudioProvider>; }
