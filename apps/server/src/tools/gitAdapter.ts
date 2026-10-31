import {gitSchema,publicSourcePath,P6Error} from './toolContracts.js';
/** Fixed read-only operations, used only inside the qualified tools guest. */
export function gitCommand(raw:unknown){const input=gitSchema.parse(raw);if(input.operation==='diff'&&input.files.some(file=>!publicSourcePath(file)))throw new P6Error('SOURCE_EXCLUDED',403);
  const common=['/usr/bin/git','--no-pager','--no-optional-locks','--literal-pathspecs','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.untrackedCache=false','-c','core.attributesFile=/dev/null','-c','diff.external=','-c','credential.helper=','-c','protocol.allow=never'];
  const argv=input.operation==='status'?[...common,'status','--porcelain=v1','-z','--untracked-files=normal']:input.operation==='log'?[...common,'log','--no-show-signature','--format=%H%x00%P%x00%an%x00%at%x00%s','--max-count='+input.limit,'--']:[...common,'diff','--no-ext-diff','--no-textconv','--no-renames','--no-color',...(input.staged?['--cached']:[]),'--',...input.files];
  return{input,argv,environment:{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',GIT_CONFIG_SYSTEM:'/dev/null',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_REPLACE_OBJECTS:'1',GIT_ATTR_NOSYSTEM:'1'}};
}
