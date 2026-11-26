import {localStatus, credentialAction, boardCheck, boardCandidates, removeBoard, accessState, setAccess} from './actions.js';
export default {
  id: 'trello', name: 'Trello', category: 'Agents', version: '1.1.0', icon: 'code',
  description: 'Give shell agents JSON access to boards you choose below. Verify private credentials, select boards and authorize writes on this computer; secrets stay in its protected local store, never plugin preferences.',
  defaultEnabled: false, machineScoped: true,
  settings: [
    {key: 'access', type: 'choice', default: 'read-only', label: 'Access',
      options: [['read-only', 'Read-only'], ['read-write', 'Read-write']],
      live: {state: accessState, set: setAccess},
      about: 'Explicit changes set this computer’s private write authorization and public Access gate. Imported preferences cannot grant writes. A write-capable token is also required.'},
  ],
  prerequisites: [
    {id: 'local-setup', label: 'Private local setup',
      about: 'Save and verify credentials, then allow at least one board. Headless herdr-trello setup remains available on each execution host.',
      check: localStatus,
      form: {
        fields: [
          {key: 'apiKey', type: 'secret', label: 'Trello API key', maxLength: 512},
          {key: 'token', type: 'secret', label: 'User token', maxLength: 512},
        ],
        enabled: (cx, result) => cx.machine == null && typeof result.revision === 'string',
        help: {label: 'How to generate a user token', url: 'https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/'},
        actions: [
          {id: 'save', label: 'Save & verify', input: true, primary: true, when: result => result.configured === false,
            run: (cx, values, item) => credentialAction(cx, values, item, 'save')},
          {id: 'verify', label: 'Verify saved', when: result => result.configured === true,
            run: (cx, values, item) => credentialAction(cx, values, item, 'verify')},
          {id: 'replace', label: 'Replace', input: true, when: result => result.configured === true,
            confirm: 'Replace saved credentials with the values entered above? Successful replacement clears allowed boards and local write permission.',
            run: (cx, values, item) => credentialAction(cx, values, item, 'replace')},
          {id: 'remove', label: 'Remove', when: result => result.configured === true,
            confirm: 'Remove this computer’s credential copy and clear its board and write permission? This does not revoke the token at Trello.',
            run: (cx, values, item) => credentialAction(cx, values, item, 'remove')},
        ],
      }},
    {id: 'boards', label: 'Allowed boards', section: true, check: boardCheck,
      list: {recheck: 'plugin', picker: {kind: 'items', label: 'Add boards', search: 'Search boards…'}, candidates: boardCandidates, remove: removeBoard}},
  ],
};
