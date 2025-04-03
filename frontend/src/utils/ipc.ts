// Wrapper para comunicação com Electron IPC

const isElectron = window && 'electron' in window;

export const ipc = {
  send: (channel: string, data?: any): void => {
    if (isElectron) {
      window.electron.ipcRenderer.send(channel, data);
      console.log(`IPC: Enviando para canal ${channel}`, data);
    } else {
      console.log(`IPC Mock: Enviando para canal ${channel}`, data);
    }
  },
  
  invoke: async (channel: string, data?: any): Promise<any> => {
    if (isElectron) {
      try {
        return await window.electron.ipcRenderer.invoke(channel, data);
      } catch (error) {
        console.error(`Erro ao invocar ${channel}:`, error);
        throw error;
      }
    } else {
      console.log(`IPC Mock: Invocando ${channel}`, data);
      
      if (channel === 'load-notes') {
        return [];
      }
      
      if (channel === 'save-note-sync') {
        return { success: true };
      }
      
      return null;
    }
  },
  
  openExternal: (url: string): void => {
    console.log('📢 Attempting to open external URL:', url);
    
    if (isElectron && window.electron) {
      try {
        window.electron.ipcRenderer.send('open-external-link', url);
        console.log(`📢 URL sent to Electron for external browser: ${url}`);
      } catch (error) {
        console.error('❌ Error sending to Electron:', error);
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } else {
      console.log(`📢 Opening URL in browser: ${url}`);
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
};
