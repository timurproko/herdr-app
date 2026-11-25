# Trello for shell agents

Trello is an optional, headless plugin. It starts **off** and **read-only**. The
agent interface is `herdr-trello`, a JSON command-line tool, not MCP or a board UI.

## Local setup

Each execution host needs its own API key and **user token**. An application/OAuth
secret is not a user token and is not used. Do not put either credential in shell
arguments, profiles, plugin settings, agent messages or portable preferences.

Prepare a private JSON input file in a protected location outside any checkout:

```json
{"apiKey":"YOUR_API_KEY","token":"YOUR_USER_TOKEN"}
```

Protect it for your OS user only (Unix: `chmod 600`); use a private current-user
ACL on Windows. Import with `herdr-trello setup --input <private-file>`. Alternatively,
feed the same JSON over protected stdin, not an echoed shell-history command.
Remove the input copy when you no longer need it. Rotation is explicit:
`herdr-trello setup --rotate --input <private-file>`. Invalid existing stores are
not silently replaced; inspect and fix local storage before trying again.

The resolved Herdr home is explicit `--home`, otherwise nonempty `HERDR_APP_HOME`,
otherwise `~/.config/herdr-app`. Private files live at
`.customizations/trello/{credentials,policy}.json` within that home. Unix stores
use 0700/0600; Windows uses a verified current-user ACL (OS administrators remain
administrators). Linked paths, checkout-local stores and unsafe/unverifiable
permissions are refused. Build/deploy never provision credentials.

Add canonical 24-character lowercase board IDs explicitly:

```sh
herdr-trello policy allow aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello policy remove aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello policy writes off
```

There is no all-boards option, automatic board enumeration or default allowed
board. Obtain IDs from boards you own in Trello; the board URL's short link is not
a canonical ID. Setup/policy commands are local and work while the plugin is off.
Enable **Settings → Plugins → Trello** for data access. Writes additionally need
its **Access: Read-write** setting, `herdr-trello policy writes on` on this host,
and a token with Trello write permission. Importing preferences alone cannot
authorize boards or writes. Policy changes are reread before every follow-up.
