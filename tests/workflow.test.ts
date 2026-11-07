import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointURL, resolveWorkflow, validateWorkflow, type Workflow} from '../src/lib/workflows/manifest';
const workflow: Workflow = {schemaVersion:1,graph:{'1':{class_type:'KSampler',inputs:{seed:5,steps:4,model:['2',0]}},'2':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'turbo.safetensors'}}},bindings:[{key:'seed',label:'Seed',node:'1',input:'seed',type:'number',min:0,max:100}]};
test('resolved graph changes only mapped inputs and preserves complete source graph',()=>{
 const result=resolveWorkflow(workflow,{seed:42});
 assert.equal(result['1'].inputs.seed,42);assert.equal(workflow.graph['1'].inputs.seed,5);
 assert.deepEqual(result['1'].inputs.model,['2',0]);assert.deepEqual(result['2'],workflow.graph['2']);
 assert.throws(()=>resolveWorkflow(workflow,{seed:-1}));assert.throws(()=>resolveWorkflow(workflow,{surprise:'x'}));
});
test('reject UI graphs and broken mappings before submission',()=>{
 assert.throws(()=>validateWorkflow({schemaVersion:1,graph:{nodes:[]},bindings:[]}));
 assert.throws(()=>validateWorkflow({...workflow,bindings:[{...workflow.bindings[0],input:'absent'}]}));
});
test('endpoint cannot smuggle credentials, paths, query keys or insecure remote origins',()=>{
 assert.equal(endpointURL('http://127.0.0.1:8188'),'http://127.0.0.1:8188');
 assert.equal(endpointURL('https://pod.proxy.runpod.net/'),'https://pod.proxy.runpod.net');
 for(const url of ['http://pod.example','https://key@pod.example','https://pod.example/?api_key=x','https://pod.example/prompt']) assert.throws(()=>endpointURL(url));
});
