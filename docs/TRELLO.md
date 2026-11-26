# Trello for shell agents

Trello is an optional plugin with private owner setup in **Settings → Plugins →
Trello**. It starts **off** and **read-only**. The agent interface is `herdr-trello`, a JSON command-line tool, not MCP or a board UI.

## Installation and shell discovery

Normal `npm run build` packages the complete runtime. Normal **full**
`npm run deploy` installs it under the resolved Herdr home and installs owned
`herdr-trello`, `herdr-trello.cmd` and `herdr-trello.ps1` launchers in
`~/.local/bin` (or the explicitly selected `HERDR_TRELLO_BIN` directory).
The chosen bin must already be on the deploying shell's PATH; otherwise deploy
fails early with guidance. Add it explicitly to your environment and rerun normal
deploy. No profiles or PATH configuration are edited for you, and no global npm
package or source-checkout path is needed at runtime. Node 20+ must be on PATH.

Bash/POSIX uses the shell launcher; PowerShell can use the `.ps1` launcher when
local script policy permits, and CMD uses `.cmd`. Quote file paths as required by
your shell. No execution-policy setting is changed. Existing agents with an old
inherited PATH need an explicit environment refresh/new shell; deployment never
restarts them or injects input. The command is installed while the plugin is off,
but no credentials, boards or write permission are provisioned.

User-bin launchers have exact-name, home-bound ownership under
`.customizations/trello-launchers.json`. Modified/unknown launchers and a launcher
belonging to another Herdr home refuse before unrelated installation writes.
Full deployment acquires the user-bin lock before journals or application payload
writes and holds it through ownership publication, even if launcher bytes are
unchanged. An existing bin lock refuses without installing or replacing payload;
inspect the active installer before considering manual lock recovery.
Normal backup rollback/removal checks their hashes and preserves later edits.
Credentials and local policy are never deployment payloads or cleanup targets.
`doctor` checks launcher ownership too. To relocate a bin, remove the original
owned installation through normal removal before deploying to a different bin.

`deploy:shell` still installs only its four shell-reporting files; it does not
install Trello. Consequently deploy:all's shell-only peers do not get this CLI or
credentials. Every execution host needs its own explicit Trello runtime installation, activation,
private credential setup and board/write policy. Settings can install only the
Trello runtime/launchers on a safely configured direct-SSH peer; no full App
installation is needed there. Merely mounting a
remote agent on this desktop does not authorize its host.

## Offline installed help

`herdr-trello --help` is sufficient to start without this checkout or a browser.
Use `herdr-trello help setup`, `help commands`, `help errors` or `help security`
for focused guidance. `herdr-trello help docs` prints the packaged offline reference
(`lib/trello/TRELLO.txt` beside the installed CLI), with embedded fallback guidance
if that optional reference is missing. Help reads no private store and sends no
network request. It covers safe input, explicit board/access gates, JSON/exits,
uncertain writes, revocation and untrusted Trello text; it adds no agent hooks.

## Generate a user token for your API key

Follow Trello's [official authorization guide](https://developer.atlassian.com/cloud/trello/guides/rest-api/authorization/):

1. Sign in as the owner and open [Power-Up administration](https://trello.com/apps/admin).
   Create/select your Power-Up, open **Trello Auth**, then **Generate a new API Key**
   if needed. A headless client still uses this API key; you do not install a board UI.
2. Use the **Token** link beside that API key, or open the following authorization
   URL in **your own browser**, replacing the placeholder locally, not in agent chat
   or a logged shell command:

   ```text
   https://trello.com/1/authorize?expiration=30days&scope=read&response_type=token&key=YOUR_API_KEY
   ```

3. Check the account, permissions and expiry on Trello's consent page and click
   **Allow**. Trello displays your user token. Save the key and token through the
   protected-input setup below. Neither the OAuth secret nor an OAuth 2.0 access
   token is substituted for this token. Request no `account` scope.
4. For intentional writes, generate a token with `scope=read,write` instead and
   separately enable both local/client write gates. Prefer short expiry (1day or
   30days); supported values also include 1hour and never. Rotation is manual.

This client uses the documented `key` and `token` **query authentication**, built
inside the Node worker over HTTPS. It never shells out with an authenticated URL,
follows redirects or prints that URL. No OAuth 2.0 flow or application secret is
used. A genuinely read-only Trello token is a server-enforced write restriction;
local read-only mode alone is not.

## Set up from the Settings card

Select the execution machine in the Settings header and enable **Plugins → Trello**.
If Requirements offers Trello runtime **Install/Update**, use that explicit action
first; it installs no credentials, grants or activation.
Expand **Requirements**, enter your API key and user token in the protected input
fields, then press **Save & verify**. The worker checks them with Trello before
saving and shows the token’s account. The fields clear after submission; saved
secrets are never loaded back into the card. **Verify saved** checks the existing
copy. **Replace** verifies newly entered values after confirmation, then clears
old board grants and local write authority. **Remove** confirms removal of this
computer’s copy and permissions; it does not revoke the token at Trello.
The card’s **How to generate a user token** opens official help without putting
your key or token in its URL.

Expand **Allowed boards → Add boards** to discover visible boards by name. Tick
only the boards agents may use and press **Add**; discovery, search and Cancel
never grant scope. The main list’s **Remove** revokes one saved grant. Incomplete
discovery is labeled and never erases unseen grants. There is no all-boards option.
Account and allowed-board names are saved as bounded non-secret hints beside the
private setup. Reopening the card reads those names without contacting Trello.
Legacy/headless setup without names needs one explicit **Requirements → Check**;
it verifies the account and hydrates missing allowed-board names. Incomplete results
never erase unseen grants. Hints are not portable preferences or authorization.
The requirement becomes Ready only with saved credentials and at least one allowed
board; local Ready does not claim an unverified token is still valid.

Under **Settings → Access**, **Read-only / Read-write** is one global choice,
independent of the header machine. An explicit change applies protected control
and private write gates on each configured account host. The displayed value is
backed by private owner consent, never an imported preference alone. New account
hosts start read-only even when the global choice was previously Read-write;
explicitly apply that choice again before they may write.

A **Pending** badge names hosts where application failed; **Retry** explicitly
applies the current choice again. Offline hosts keep their last acknowledged
rights, including any previous write grant, until successfully contacted. There
is no atomic disconnected-host revocation or automatic replay of grants on
reconnect. Status checks do not apply rights. A write-capable Trello token is
still required, and a read-only token remains server-enforced read-only.

Managed execution-host control is separate from board grants and credentials.
Missing/invalid managed control denies access instead of falling back to legacy
public state. Existing full installations keep their old gates until explicit
owner adoption; local disabled state remains authoritative. Another controller
cannot silently take over: remove the account explicitly first. Headless writes
off can always reduce authority and writes on cannot bypass the global gate.
No board grant, control receipt or private write permission is exported/imported
with preferences.
Credential-bearing snapshot fields, including `apiKey` and `token`, are refused
rather than imported into shared plugin state.

For an SSH-selected machine, status and explicit account/board actions use only
that machine's private store. The local one-shot bridge resolves the configured
machine, pins its Core identity/session and execution user/home, then sends secrets
only over strict noninteractive SSH stdin after a readiness handshake. There is no
local fallback, remote listener, secret-bearing command/environment or temporary
credential input file. Protected final-store atomic replacement files still exist.

Temporary/custom-via connections, unprovable or elevated execution identities,
changed Core sessions and unsupported shell arrangements are refused. Existing
SSH host trust, key authentication, Node 20+ and the selected user's Core session
are prerequisites; the feature never accepts a new host key, prompts for a password
or installs Node/changes PATH. A missing Trello runtime gets the normal Requirements
Install action. Conflicting or modified launchers/runtime files refuse overwrite;
owned installation keeps a public rollback record and preserves private setup.

A timeout after possible commit means **setup outcome unknown**. Check destination
status before an explicit retry; cancelling cannot recall an already committed
change and there is no replay. Shell-only deployment remains shell-only, and no
credential is copied between machines or provisioned by deployment.

## Headless local setup

Each execution host needs its own API key and **user token**. An application/OAuth
secret is not a user token and is not used. Do not put either credential in shell
arguments, profiles, persistent plugin settings, agent messages or portable
preferences. The card’s transient inputs are not saved plugin settings.

Prepare a private JSON input file in a protected location outside any checkout:

```json
{"apiKey":"YOUR_API_KEY","token":"YOUR_USER_TOKEN"}
```

Protect it for your OS user only (Unix: `chmod 600`); use a private current-user
ACL on Windows. Import with `herdr-trello setup --input <private-file>`. Alternatively,
feed the same JSON over protected stdin, not an echoed shell-history command.
Remove the input copy when you no longer need it. Rotation is explicit:
`herdr-trello setup --rotate --input <private-file>`. Rotation clears board/write
authority and old display names; add grants again explicitly. Invalid existing stores are
not silently replaced; inspect and fix local storage before trying again.

Installed launchers already supply the deployment's `--home`; do not supply a
second one. For direct `node <installed-runtime>/lib/trello/cli.cjs` invocation,
the home is explicit `--home`, otherwise nonempty `HERDR_APP_HOME`, otherwise
`~/.config/herdr-app`. Private files live at
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

The headless agent CLI has no all-boards option, automatic account-wide board
enumeration or default allowed board. The owner’s Settings picker is the explicit
exception for discovery, not agent access. For headless policy commands, obtain
IDs from boards you own in Trello; the board URL's short link is not
a canonical ID. For a board you own, its Trello **Print and export → Export JSON**
view contains the full board `id`; copy that ID yourself rather than importing an
account inventory. Setup/policy commands are local and work while the plugin is off.
Enable **Settings → Plugins → Trello** for data access. Writes additionally need
its **Access: Read-write** setting, `herdr-trello policy writes on` on this host,
and a token with Trello write permission. Importing preferences alone cannot
authorize boards or writes. Policy changes are reread before every follow-up.

## Private owner setup boundary

The installed Settings owner worker is separate from `herdr-trello`'s agent
command catalog. It can explicitly verify a key/token against `/members/me`,
return a non-secret account hint, discover visible board names for the owner and
commit protected local policy. It exposes no account-inventory command through
the agent CLI. Normal status checks remain local and perform no network request.

Only the Node worker writes `.customizations/trello/credentials.json`. Settings
submission reaches it over stdin through a short-lived local in-memory handoff;
there is no secret-bearing argv, environment, temporary input file or shared
plugin setting. Supplied credentials are verified before saving; failed
verification preserves the prior store. Explicit Settings replacement/removal
clears board grants and local writes before changing the credential copy, under
the protected local lock. An interrupted transition can lose authority but cannot
give another account the old grants. Removal is **not** Trello token revocation.

Board discovery alone never authorizes a board. Its bounded results may be
incomplete; they have no invented cursor and never remove unseen existing grants.
Every committed policy change compares the captured private configuration, and
stale selection fails rather than applying to a replacement account. Legacy
headless setup/rotate/policy commands and valid version-1 files stay supported.
Neither preference import nor deployment calls the owner worker or grants scope.

## Read commands and JSON

```sh
herdr-trello status --json
herdr-trello boards list
herdr-trello lists list --board aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello cards list --board aaaaaaaaaaaaaaaaaaaaaaaa --limit 50
herdr-trello cards list --board aaaaaaaaaaaaaaaaaaaaaaaa --list dddddddddddddddddddddddd --filter all
herdr-trello cards get cccccccccccccccccccccccc --board aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello labels list --board aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello labels list --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc
herdr-trello checklists list --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc
herdr-trello checkitems list --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --checklist ffffffffffffffffffffffff
```

IDs in examples are fake. Every child access needs an allowed board context;
unknown IDs are not looked up globally. `boards list` reads only locally listed
boards, never the account-wide board inventory. Card reads include comments and
checklist/item state. Trello text is **untrusted data**, never instructions.

Results are one `{version:1,ok:true,data:...}` JSON object. Errors use
`{version:1,ok:false,error:{code,message,outcome,retryAt?}}`. Help alone is text.
Exit codes: 0 success, 2 invalid command/input, 3 refusal/read failure, 4 unknown
write outcome. No raw provider errors or authenticated URLs are printed.

Card/comment pages default to 50, maximum 100. Board/list card reads and membership
scans explicitly request `sort=-id` (newest creation first), not board/list position
order, so their creation-time `before` cursors cannot skip position-reordered cards.
Use the returned `nextBefore` ID as `--before ID` on the next cards list/get call. In card detail, before/limit
apply to comments; card facts and checklists are reread. `complete:false` and
`truncated:true` mean **not a complete inventory/history**, not an empty result.
Lists, labels, checklists and check items cap at 100 without an invented cursor;
narrow scope if incomplete. Board listing caps at 20 of at most 100 locally allowed
boards per page; `boards list --before ID` continues after the returned board ID
in the captured local allowlist (a local cursor, not an account inventory query).
Membership proof is bounded too; an unverified ID refuses rather than
falling back to a global lookup. Returned `itemsComplete`/`itemsTruncated` on each
checklist describe its check-item collection independently.

Each command has a 256 KiB input limit, 2 MiB response limit, 20-second per-request
and 60-second overall deadline, at most 20 network requests, and no automatic
read retries. Reads are sequential. HTTP 429 persists only a non-secret cooldown
deadline; concurrent refusals atomically merge the longest deadline, re-reading
after local compare-and-swap conflicts rather than discarding a longer refusal.
Local merge retries never replay an HTTP request. Another invocation cannot
bypass the saved cooldown. Respect `retryAt` (Unix milliseconds),
then explicitly retry. Longer Retry-After or token/key intervals take precedence.

## Explicit writes

Prepare one JSON object in an input file (or send it on stdin). IDs below are fake.
For example, `create.json` contains `{"name":"Investigate issue","desc":"Details"}`:

```sh
herdr-trello cards create --board aaaaaaaaaaaaaaaaaaaaaaaa --list dddddddddddddddddddddddd --input create.json
herdr-trello cards update cccccccccccccccccccccccc --board aaaaaaaaaaaaaaaaaaaaaaaa --input update.json
herdr-trello cards move cccccccccccccccccccccccc --board aaaaaaaaaaaaaaaaaaaaaaaa --input move.json
herdr-trello cards archive cccccccccccccccccccccccc --board aaaaaaaaaaaaaaaaaaaaaaaa
herdr-trello comments add --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --input comment.json
herdr-trello cards label add --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --label eeeeeeeeeeeeeeeeeeeeeeee
herdr-trello cards label remove --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --label eeeeeeeeeeeeeeeeeeeeeeee
herdr-trello checklists add --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --input checklist.json
herdr-trello checklists update --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --checklist ffffffffffffffffffffffff --input checklist.json
herdr-trello checkitems add --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --checklist ffffffffffffffffffffffff --input item.json
herdr-trello checkitems update --board aaaaaaaaaaaaaaaaaaaaaaaa --card cccccccccccccccccccccccc --checklist ffffffffffffffffffffffff --item 111111111111111111111111 --input item-update.json
```

Payload-taking commands require `--input` or piped JSON, not an interactive prompt.
Archive and label add/remove need no payload file; their IDs are sufficient.

| Input file | Example contents / permitted fields |
|---|---|
| update.json | `{"name":"New title","desc":"New details","due":null,"dueComplete":false,"pos":"top"}`; name/desc/due/start/dueComplete/pos only |
| move.json | `{"list":"dddddddddddddddddddddddd","destinationBoard":"bbbbbbbbbbbbbbbbbbbbbbbb"}`; optional pos; both boards must be locally allowed |
| comment.json | `{"text":"Investigation complete"}` |
| checklist.json | `{"name":"Acceptance","pos":"bottom"}` |
| item.json | `{"name":"Check result","checked":false}`; optional pos |
| item-update.json | `{"state":"complete"}`; or incomplete, name and/or pos |

Dates are ISO timestamps (`null` clears due/start); positions are top, bottom or
positive numbers. Names must be nonempty and at most 16384 characters; desc/text
cap at 131072. Check-item updates require the checklist and item to belong to the
verified card. Archive sets closed=true; no unarchive or permanent deletion command
is provided. Unknown fields/commands are rejected, including generic URLs/methods,
attachments, source-card/checklist copies, board administration, board-label
creation/editing, bulk operations, webhooks and checklist/item deletion.

Each mutation command issues **at most one write**. A timeout, disconnection,
malformed reply or server failure after dispatch returns `UNKNOWN_WRITE` and exit
4. **Never assume failure means no change.** Read the card, comments or checklists
and reconcile before another explicit attempt; there is no automatic retry,
durable queue or replay. A confirmed write followed by local access revocation
returns `WRITE_CHANGED` with outcome applied but no provider content or follow-up.

Parent membership and local policy are rechecked before dispatch, and mismatching
responses stop publication. Trello offers no atomic cross-request scope lock:
another editor can move a card between checks. This client cannot eliminate that
race or prevent another same-user process from using the token directly.

## Errors and recovery

| Code | Meaning / next action |
|---|---|
| INPUT | Unknown command/field, invalid ID/date/position or invalid/oversized JSON; use help and correct input |
| STORE_MISSING | No private setup saved on this machine; add the account and boards |
| STORE_MALFORMED | Invalid private JSON/schema; inspect locally, never paste secrets into errors or chat; no automatic replacement |
| STORE_PERMISSIONS | Wrong owner or another user has access; restrict storage before continuing |
| STORE_PERMISSION_CHECK | Permission tooling could not verify storage; check ACL tooling, not credential setup |
| STORE_IN_CHECKOUT / STORE_UNSAFE_PATH | Checkout-local, linked, non-regular or multiply linked storage is refused |
| STORE_BUSY / STORE_IO | Active setup lock or filesystem failure; inspect the operation/access before an explicit retry |
| PUBLIC_STATE_INVALID | Host activation or Access could not be validated; no authority granted |
| INTERNAL | Unclassified internal failure, with no raw exception or automatic retry |
| CONFLICT | Existing credentials, concurrent local edit or unexpected rotation; inspect current local state and use explicit rotation only when intended |
| DISABLED / STALE | Plugin disabled or authority changed; recheck Settings and local policy before a new command |
| SCOPE | Board not allowed or child membership unverified within bounds; correct explicit IDs or allowlist, never bypass with an arbitrary URL |
| READ_ONLY | Set public Access and separate local write opt-in intentionally; a read-write token is also needed |
| AUTH | HTTP 401; key/token invalid, expired or revoked; locally re-authorize and rotate (the tool cannot distinguish those causes from status alone) |
| FORBIDDEN / NOT_FOUND | HTTP 403 / 404; check the owner's access and IDs; not-found may also hide access, so it is not proof the object was deleted |
| RATE_LIMIT | Wait until retryAt; do not spin or launch parallel retries |
| LIMIT / RESPONSE / TRANSPORT / REMOTE | Request/time/response bound, malformed reply, connectivity failure or HTTP rejection; inspect/narrow the read and retry explicitly |
| UNKNOWN_WRITE / WRITE_CHANGED | Unknown outcome / acknowledged write with changed authority; reconcile through reads before another explicit mutation |

`status` and automatic Settings checks inspect only local configuration; they do
not contact Trello and cannot confirm that a token is still valid. Absent setup is
distinct from a failed permission check or corrupt store; failed checks refuse access
rather than pretending credentials are missing. On Windows, the ACL subprocess uses
system Windows PowerShell with its own module path, even when launched from PowerShell 7;
the caller environment and owner-only permission requirements stay unchanged. No error
causes an account switch, credential search, write retry or webhook setup.

## Revocation and security limits

At `https://trello.com/u/YOUR_USERNAME/account`, open **Applications** and click
**Revoke** beside this authorization. Trello then rejects that token (HTTP 401).
To continue later, explicitly authorize a new token and use Replace in the local
Settings card or run headless setup with `--rotate`.
To stop this client immediately, disable Trello, use `policy writes off`, and/or
remove boards from local policy. Deleting the protected local credential file
after use is stopped removes this copy only: it does **not** revoke the token at
Trello or erase your own protected input copies. Build, update, rollback and
removal never erase these private files for you.

**An agent with shell access as the same OS user can read the credential file**,
change local policy or call Trello directly. File permissions protect against
accidental disclosure and other ordinary users, not that agent, administrators,
backups or a compromised account. This is a private plaintext file, not an
encrypted vault, and plugin read-only/board allowlisting is a client boundary,
not a sandbox or Trello per-board token restriction. A token may access more
boards than this allowlist. Use a minimally privileged/dedicated Trello account
and a read-only token when possible. Stronger isolation requires a separate OS
identity/broker and is outside this plugin.

Credentials are never portable preferences, persistent plugin settings, terminal labels,
command arguments, build assets or diagnostics. Board content is not cached on
disk. Only the separate non-secret rate-limit deadline may persist. Do not share
private stores, exports of unrelated personal preferences or input copies in this
public repository.

## API contract and verification

Owner verification and board discovery follow Atlassian's
[Members](https://developer.atlassian.com/cloud/trello/rest/api-group-members/)
reference (`/members/me` and `/members/me/boards`), separately from agent routes.
The typed agent routes follow Atlassian's [Cards](https://developer.atlassian.com/cloud/trello/rest/api-group-cards/),
[Boards](https://developer.atlassian.com/cloud/trello/rest/api-group-boards/),
[Lists](https://developer.atlassian.com/cloud/trello/rest/api-group-lists/) and
[Checklists](https://developer.atlassian.com/cloud/trello/rest/api-group-checklists/)
references and their [linked OpenAPI](https://dac-static.atlassian.com/cloud/trello/swagger.v3.json?_v=1.1274.0).
[Introduction/paging](https://developer.atlassian.com/cloud/trello/guides/rest-api/api-introduction/)
documents before/since ID paging for cards/actions; the individual collection
schemas omit some of those parameters. The [nested card resource contract](https://developer.atlassian.com/cloud/trello/guides/rest-api/nested-resources/#cards-nested-resource)
documents `sort=none` by default and the explicit `-id` ordering this client uses.
No offset cursor is invented.
[Rate guidance](https://developer.atlassian.com/cloud/trello/guides/rest-api/rate-limits/)
describes shared key/token budgets; other applications can consume them too.

Regression tests use fake credentials, disposable homes/bins and injected
transport only, including CLI subprocesses. No real-board or real-token
acceptance is claimed; API conformance is documentation-checked. The offline fixtures do not prove live Trello access. A separate opt-in disposable
native fixture captures the running Settings card with fake credentials and
injected provider responses; see [testing guidance](TESTING.md#trello-settings-setup).
Any real Trello check
requires separate owner authorization and is not part of build/test/deploy.
