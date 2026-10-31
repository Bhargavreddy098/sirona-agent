const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('sirona',Object.freeze({
  bootstrap:()=>ipcRenderer.invoke('sirona-next:bootstrap'),
  copyText:text=>ipcRenderer.invoke('sirona-next:copy-text',text),
  pickFolder:()=>ipcRenderer.invoke('sirona-next:pick-folder'),
  saveConnection:input=>ipcRenderer.invoke('sirona-next:save-connection',input),
  getCredentialStatus:()=>ipcRenderer.invoke('sirona-next:credential-status')
}));
