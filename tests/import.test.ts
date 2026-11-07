import test from 'node:test';
import assert from 'node:assert/strict';
import { fileSelectionError } from '../src/lib/fileSelection';
import { toVideoKeyframe } from '../src/lib/videoKeyframes';
import { workflowExamples } from '../src/lib/workflows/examples';
import { validateWorkflow } from '../src/lib/workflows/manifest';

test('flat saved video clip retains the editor data contract after server acknowledgement', () => {
  const optimistic = toVideoKeyframe({id:'temporary',trackId:'video',timestamp:0,duration:1000,dataType:'video',mediaId:'upload',url:'asset://local/clip.mp4',originalDuration:3000});
  const saved = toVideoKeyframe({id:'saved',trackId:'video',timestamp:0,duration:1000,dataType:'video',mediaId:'upload',url:'asset://local/clip.mp4'}, optimistic);
  assert.equal(saved.id,'saved'); assert.equal(saved.data.type,'video');
  assert.equal(saved.data.url,'asset://local/clip.mp4'); assert.equal(saved.data.originalDuration,3000);
  assert.equal(toVideoKeyframe(saved).data,saved.data);
});

test('drop validation matches picker filters and rejects multiple or incompatible files', () => {
  const video={name:'CLIP.MP4',type:''},json={name:'graph.json',type:'application/json'};
  assert.equal(fileSelectionError([video],'.mp4'),null);
  assert.equal(fileSelectionError([{...video,type:'video/mp4'}],'video/*'),null);
  assert.ok(fileSelectionError([video],'.json'));
  assert.ok(fileSelectionError([json,json],'.json'));
  assert.equal(fileSelectionError([json,json],'.json',true),null);
});

test('welcome examples are importable API manifests without model or paid API dependencies', () => {
  for (const example of workflowExamples) {
    validateWorkflow(example.document);
    assert.equal(example.document.graph['1'].inputs.width,32);
    assert.equal(example.document.bindings.length,0);
  }
  assert.equal(workflowExamples[1].document.graph['2'].class_type,'SaveWEBM');
  assert.equal(workflowExamples[1].document.graph['1'].inputs.batch_size,12);
});
