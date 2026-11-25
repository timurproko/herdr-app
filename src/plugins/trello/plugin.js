import {localStatus} from './actions.js';
export default {
  id: 'trello', name: 'Trello', category: 'Agents', version: '1.0.0', icon: 'code',
  description: 'Give shell agents JSON access to explicitly allowed Trello boards. Set up credentials and board scope locally with herdr-trello; never in plugin settings.',
  defaultEnabled: false,
  settings: [
    {key: 'access', type: 'choice', default: 'read-only', label: 'Access',
      options: [['read-only', 'Read-only'], ['read-write', 'Read-write']],
      about: 'Writes also need the separate local opt-in, allowed boards and a write-capable user token. This setting alone grants no write authority.'},
  ],
  prerequisites: [{id: 'local-setup', label: 'Private local setup',
    about: 'Install with normal full deployment, then use herdr-trello setup and policy commands on this computer. No remote credential copying.',
    check: localStatus}],
};
