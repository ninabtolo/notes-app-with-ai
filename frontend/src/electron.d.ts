interface ElectronAPI {
  ipcRenderer: {
    send: (channel: string, data?: any) => void;
    invoke: (channel: string, data?: any) => Promise<any>;
    on: (channel: string, func: (...args: any[]) => void) => void;
    removeAllListeners: (channel: string) => void;
  };
}

interface Window {
  electron?: ElectronAPI;
  electronAPI?: {
    loadNotes: () => Promise<any>;
    saveNotes: (notes: any) => Promise<any>;
  };
}
