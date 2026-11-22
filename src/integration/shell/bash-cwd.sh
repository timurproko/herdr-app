# Source from interactive Bash only. No cd, terminal input, agent startup or screen parsing.
# Native Win32 cwd may stay at Git Bash's launch folder after a POSIX chdir.
# Captured agent-tool shells may inherit HC_TERMINAL_ID; they are not the terminal.
[[ $- == *i* && -n ${HC_TERMINAL_ID:-} && -t 1 ]] || return 0

# Refresh launch definitions only at an idle shell prompt, never inside an agent.
# Existing Herdr Bash tabs pick up normal `claude` isolation without input injection.
_claude_shell_init="$HOME/.claude/plugins-local/account-switcher/bin/shell-init.sh"
[[ ! -r $_claude_shell_init ]] || source "$_claude_shell_init"
unset _claude_shell_init

_herdr_cwd_uri_path() {
    local LC_ALL=C input=$1 char encoded='' byte i
    for ((i=0; i<${#input}; i++)); do
        char=${input:i:1}
        case "$char" in
            [a-zA-Z0-9/._~:-]) encoded+=$char ;;
            *) printf -v byte '%%%02X' "'$char"; encoded+=$byte ;;
        esac
    done
    [[ $encoded == /* ]] || encoded=/$encoded
    printf '%s' "$encoded"
}

_herdr_report_cwd() {
    local status=${1:-$?} directory user_home reporter
    directory=$(builtin pwd -W 2>/dev/null) || directory=$(builtin pwd -P) || return "$status"
    user_home=$HOME
    if command -v cygpath >/dev/null 2>&1; then
        user_home=$(cygpath -am -- "$HOME") || return "$status"
    fi
    case "$directory$user_home" in
        *$'\n'*|*$'\r'*|*$'\033'*|*$'\007'*) return "$status" ;;
    esac
    [[ ${_herdr_cwd_last:-} != "$HC_TERMINAL_ID|$directory|$user_home" ]] || return "$status"
    # Standard notification for terminals that consume OSC 7.
    printf '\033]7;file://%s\033\\' "$(_herdr_cwd_uri_path "$directory")"
    if type -P hc >/dev/null 2>&1; then
        reporter=$(type -P hc)
    elif [[ -n ${LOCALAPPDATA:-} && -x $LOCALAPPDATA/Programs/herdr-core/hc.exe ]]; then
        reporter=$LOCALAPPDATA/Programs/herdr-core/hc.exe
    else
        return "$status"
    fi
    # Two private, untracked terminal labels; never change names/status or send
    # input. Keep failures silent and retry at the next prompt.
    if "$reporter" label "$HC_TERMINAL_ID" "custom.cwd=$directory" "custom.home=$user_home" --json >/dev/null 2>&1; then
        _herdr_cwd_last="$HC_TERMINAL_ID|$directory|$user_home"
    fi
    return "$status"
}

# The deployed dispatcher loads definitions only, then reports with the
# original command's exit status. Direct sourcing remains backward-compatible.
[[ ${_herdr_cwd_reload_only:-0} != 1 ]] || return 0

# Append after Starship's existing hooks; leave PS1, traps and cd/zoxide intact.
if [[ $(declare -p PROMPT_COMMAND 2>/dev/null) == 'declare -a '* ]]; then
    _herdr_cwd_registered=false
    for _herdr_cwd_hook in "${PROMPT_COMMAND[@]}"; do
        [[ $_herdr_cwd_hook != _herdr_report_cwd ]] || _herdr_cwd_registered=true
    done
    $_herdr_cwd_registered || PROMPT_COMMAND+=(_herdr_report_cwd)
    unset _herdr_cwd_registered _herdr_cwd_hook
else
    case ";${PROMPT_COMMAND:-};" in
        *';_herdr_report_cwd;'*|*'; _herdr_report_cwd;'*) ;;
        *) PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }_herdr_report_cwd" ;;
    esac
fi
_herdr_report_cwd
