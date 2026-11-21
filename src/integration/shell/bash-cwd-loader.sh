# Stable, yadm-tracked bootstrap. Payload updates reload at a safe Bash prompt;
# never inject terminal input, restart shells/agents, or require Herdr Desktop.
[[ $- == *i* && -n ${HC_TERMINAL_ID:-} && -t 1 ]] || return 0

_herdr_cwd_prompt() {
    local status=$? revision=''
    local payload="$HOME/.config/herdr-app/customizations/src/integration/shell/bash-cwd.sh"
    local marker="$HOME/.local/state/yadm/herdr-shell.revision"
    local _herdr_cwd_reload_only=1
    [[ -r $payload ]] || return "$status"
    [[ ! -r $marker ]] || revision=$(<"$marker")
    if [[ -z $revision || ${_herdr_cwd_revision:-} != "$revision" ]] || ! declare -F _herdr_report_cwd >/dev/null; then
        source "$payload" || return "$status"
        _herdr_cwd_revision=$revision
        unset _herdr_cwd_last
    fi
    _herdr_report_cwd "$status"
    return "$status"
}

# Keep every existing prompt hook and register our dispatcher only once.
if [[ $(declare -p PROMPT_COMMAND 2>/dev/null) == 'declare -a '* ]]; then
    _herdr_cwd_registered=false
    for _herdr_cwd_entry in "${PROMPT_COMMAND[@]}"; do
        [[ $_herdr_cwd_entry != _herdr_cwd_prompt ]] || _herdr_cwd_registered=true
    done
    $_herdr_cwd_registered || PROMPT_COMMAND+=(_herdr_cwd_prompt)
    unset _herdr_cwd_registered _herdr_cwd_entry
else
    case ";${PROMPT_COMMAND:-};" in
        *';_herdr_cwd_prompt;'*|*'; _herdr_cwd_prompt;'*) ;;
        *) PROMPT_COMMAND="${PROMPT_COMMAND:+$PROMPT_COMMAND; }_herdr_cwd_prompt" ;;
    esac
fi
_herdr_cwd_prompt
