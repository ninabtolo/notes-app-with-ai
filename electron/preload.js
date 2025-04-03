const { contextBridge, ipcRenderer } = require('electron');

// Expor APIs seguras do Electron para o frontend
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // Lista de canais permitidos que o frontend pode usar
      const validChannels = [
        'load-notes', 
        'save-notes', 
        'delete-note', 
        'save-note-sync',
        'open-external-link'
      ];
      
      if (validChannels.includes(channel)) {
        console.log(`Sending to channel ${channel}:`, data);
        ipcRenderer.send(channel, data);
      } else {
        console.warn(`Attempted to send to unauthorized channel: ${channel}`);
      }
    },
    invoke: (channel, data) => {
      const validChannels = [
        'load-notes', 
        'save-note-sync'
      ];
      
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      
      return Promise.reject(new Error(`Canal não permitido: ${channel}`));
    },
    on: (channel, func) => {
      const validChannels = [
        'note-saved', 
        'note-deleted'
      ];
      
      if (validChannels.includes(channel)) {
        const subscription = (_, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
    }
  }
});
