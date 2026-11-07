import {test} from 'node:test';
import assert from 'node:assert/strict';
import {restorePreferences} from '../src/preferences.ts';
const restore = raw => restorePreferences(raw, ['ready', 'luxury'], ['UAE', 'Qatar']);
test('restores region and removes stale, duplicate and invalid saved IDs', () => {
 assert.deepEqual(restore(JSON.stringify({saved:['ready','ready','deleted',null,42,'luxury'],country:'Qatar'})),{saved:['ready','luxury'],country:'Qatar'});
});
test('recovers from corrupted, missing and non-object stored values', () => {
 for(const raw of [null,'{broken','null','42','"text"','[]']) assert.deepEqual(restore(raw),{saved:[],country:'UAE'});
});
test('rejects invalid saved lists and regions without discarding valid IDs', () => {
 assert.deepEqual(restore('{"saved":"ready","country":"Unknown"}'),{saved:[],country:'UAE'});
 assert.deepEqual(restore('{"saved":["ready"],"country":7}'),{saved:['ready'],country:'UAE'});
});
