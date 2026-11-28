import {localStatus, runtimeStatus, credentialAction, removeAccount, boardCheck, boardCandidates, removeBoard, accessState, setAccess} from './actions.js';
import {prepareProfile, enabledChanged, syncLifecycle} from './discovery.js';
export default {
  id: 'trello', name: 'Trello', category: 'Agents', version: '1.4.0', icon: 'code',
  prepareProfile,
  onEnabledChange: enabledChanged,
  lifecycle: {'sidebar.sync': syncLifecycle},
  description: 'Let agents read and update cards on the boards you choose.',
  descriptionLinks: [{label: 'API key and token', url: 'https://trello.com/apps/admin'}],
  defaultEnabled: false, machineScoped: true,
  settings: [
    {key: 'access', type: 'choice', default: 'read-only', label: 'Access',
      options: [['read-only', 'Read-only'], ['read-write', 'Read-write']],
      live: {state: accessState, set: setAccess}, about: 'All configured machines'},
  ],
  prerequisites: [
    {id: 'runtime', updates: true, label: 'Trello runtime', check: runtimeStatus},
    {id: 'local-setup', label: 'Account', check: localStatus,
      saved: {
        replace: true,
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
          {id: 'save', label: 'Save', busyLabel: 'Saving', input: true, primary: true, when: result => result.configured === false,
            run: (cx, values, item) => credentialAction(cx, values, item, 'save')},
        ],
      }},
    {id: 'boards', label: 'Boards', section: true, check: boardCheck,
      list: {recheck: 'plugin', refreshOnOpen: true, hideUnavailable: true, scope: {header: true, divider: 'items'}, picker: {kind: 'items', label: 'Add boards', search: 'Search boards…',
        tabStyle: 'tabs', tabs: [['active', 'Active'], ['inactive', 'Inactive']]}, candidates: boardCandidates, remove: removeBoard}},
  ],
};
