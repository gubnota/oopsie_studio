'use client';
import React, { Children, isValidElement, useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Upload } from 'lucide-react';

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
  return <div className="studio-upload"><input {...props} type="file" ref={ref} className="sr-only" tabIndex={-1} onChange={event=>{setFilename(Array.from(event.target.files??[]).map(f=>f.name).join(', ')||'No file selected');onChange?.(event);}}/><button type="button" className="studio-upload-button" disabled={props.disabled} onClick={()=>ref.current?.click()}><Upload size={16}/>Choose file</button><span className="truncate studio-caption" title={filename}>{filename}</span></div>;
}
