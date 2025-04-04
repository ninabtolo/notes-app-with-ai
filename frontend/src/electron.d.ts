interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
}

interface LegacyElectronAPI {
  loadNotes: () => Promise<any>;
  saveNotes: (notes: any) => Promise<any>;
}

interface Window {
  electron: ElectronAPI | undefined;
  electronAPI: LegacyElectronAPI | undefined;
  openExternalLink?: (url: string) => boolean;
}
