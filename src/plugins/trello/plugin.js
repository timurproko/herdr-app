import {localStatus, runtimeStatus, credentialAction, removeAccount, boardCheck, boardCandidates, removeBoard, accessState, setAccess} from './actions.js';
export default {
  id: 'trello', name: 'Trello', category: 'Agents', version: '1.2.0', icon: 'code',
  description: 'JSON access to boards you add.',
  descriptionLinks: [{label: 'API key and token', url: 'https://trello.com/apps/admin'}],
  defaultEnabled: false, machineScoped: true,
  settings: [
    {key: 'access', type: 'choice', default: 'read-only', label: 'Access',
      options: [['read-only', 'Read-only'], ['read-write', 'Read-write']],
      live: {state: accessState, set: setAccess}, about: 'All configured machines'},
  ],
  prerequisites: [
    {id: 'runtime', label: 'Trello runtime', check: runtimeStatus},
    {id: 'local-setup', label: 'Account', check: localStatus,
      saved: {
        row: result => result.configured === true ? {label: result.account?.name ?? 'Check to load name'} : null,
        confirm: (cx, result) => ({title: 'Remove account?', label: 'Remove',
          detail: `${cx.machine ?? 'This computer'} · ${result.account?.name ?? 'Account'}. This does not revoke the token.`}),
        remove: removeAccount,
      },
      form: {
        when: result => result.configured === false,
        fields: [
          {key: 'apiKey', type: 'secret', label: 'Trello API key', maxLength: 512},
          {key: 'token', type: 'secret', label: 'User token', maxLength: 512},
        ],
        enabled: (_cx, result) => result.configured === false && typeof result.revision === 'string',
        actions: [
          {id: 'save', label: 'Save & verify', input: true, primary: true, when: result => result.configured === false,
            run: (cx, values, item) => credentialAction(cx, values, item, 'save')},
        ],
      }},
    {id: 'boards', label: 'Boards', section: true, check: boardCheck,
      list: {recheck: 'plugin', hideUnavailable: true, scope: {header: true}, picker: {kind: 'items', label: 'Add boards', search: 'Search boards…',
        tabs: [['active', 'Active'], ['inactive', 'Inactive']]}, candidates: boardCandidates, remove: removeBoard}},
  ],
};
