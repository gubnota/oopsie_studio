'use client';
import React, { Children, isValidElement, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Upload } from 'lucide-react';
import { fileSelectionError } from '@/lib/fileSelection';

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'multiple' | 'size'>;
/** Shared, keyboard-accessible menu; no platform select popup. */
export function StudioSelect({children, value, defaultValue, onChange, className='', disabled, id, name, ...props}: Props) {
  const [local,setLocal]=useState(String(defaultValue??''));
  const [open,setOpen]=useState(false);
  const selected=String(value??local);
  const options: {value:string;label:React.ReactNode;disabled?:boolean}[]=[];
  const visit=(nodes:React.ReactNode)=>Children.forEach(nodes,node=>{
    if(!isValidElement<{value?:string|number;children?:React.ReactNode;disabled?:boolean}>(node))return;
    if(node.type==='option')options.push({value:String(node.props.value??node.props.children??''),label:node.props.children,disabled:node.props.disabled});
    else visit(node.props.children);
  });visit(children);
  const chosen=options.find(o=>o.value===selected);
  return <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
    <Menu.Trigger asChild><button type="button" id={id} name={name} disabled={disabled} aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby']} aria-invalid={props['aria-invalid']} className={`studio-select studio-field ${className}`}><span className="truncate">{chosen?.label??'Choose an option'}</span><ChevronDown aria-hidden size={15} className={open?'rotate-180':''}/></button></Menu.Trigger>
    <Menu.Portal><Menu.Content className="studio-menu" sideOffset={6} collisionPadding={12} align="start"><Menu.RadioGroup value={selected} onValueChange={next=>{
      setLocal(next);onChange?.({target:{value:next,name},currentTarget:{value:next,name}} as React.ChangeEvent<HTMLSelectElement>);
    }}>{options.map((option,i)=><Menu.RadioItem className="studio-menu-item" key={`${option.value}-${i}`} value={option.value} disabled={option.disabled}><span className="truncate">{option.label}</span><Menu.ItemIndicator><Check size={15}/></Menu.ItemIndicator></Menu.RadioItem>)}</Menu.RadioGroup></Menu.Content></Menu.Portal>
  </Menu.Root>;
}
export function StudioFileInput({onChange, ...props}:React.InputHTMLAttributes<HTMLInputElement>) {
  const ref=React.useRef<HTMLInputElement>(null),[filename,setFilename]=useState('JSON or media file');
  const [dragging,setDragging]=useState(false),[error,setError]=useState('');
  return <div className="space-y-2"><div className={`studio-upload ${dragging?'studio-upload-active':''}`} onDragOver={event=>{if(!event.dataTransfer.types.includes('Files'))return;event.preventDefault();event.stopPropagation();if(!props.disabled)setDragging(true);}} onDragLeave={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setDragging(false);}} onDrop={event=>{
    event.preventDefault();event.stopPropagation();setDragging(false);if(props.disabled)return;
    const files=Array.from(event.dataTransfer.files), problem=fileSelectionError(files,props.accept,props.multiple);
    if(problem){setError(problem);return;}
    if(ref.current){const transfer=new DataTransfer();files.forEach(file=>transfer.items.add(file));ref.current.files=transfer.files;ref.current.dispatchEvent(new Event('change',{bubbles:true}));}
  }}><input {...props} type="file" ref={ref} className="sr-only" tabIndex={-1} onChange={event=>{const problem=fileSelectionError(Array.from(event.target.files??[]),props.accept,props.multiple);setError(problem??'');if(problem)return;setFilename(Array.from(event.target.files??[]).map(f=>f.name).join(', '));onChange?.(event);}}/><button type="button" className="studio-upload-button" disabled={props.disabled} onClick={()=>{if(ref.current)ref.current.value='';ref.current?.click();}}><Upload size={16}/>Choose file</button><span className="truncate studio-caption" title={filename}>{dragging?'Drop to import':filename}</span></div>{error?<p role="alert" className="text-xs text-[#F0A868]">{error}</p>:<p className="studio-caption text-xs">Or drop {props.multiple?'files':'a file'} here{props.accept?` · ${props.accept}`:''}</p>}</div>;
}
