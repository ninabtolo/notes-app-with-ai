const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      // Lista de canais permitidos que o frontend pode usar
      const validChannels = [
        'open-external-link', 
        'save-note', 
        'save-notes', 
        'delete-note',
        'save-note-sync',
        'load-notes'
      ];
      
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      } else {
        console.warn(`Attempted to send to unauthorized channel: ${channel}`);
      }
    },
    invoke: (channel, data) => {
      const validChannels = ['load-notes', 'save-note-sync', 'save-notes'];
      if (validChannels.includes(channel)) {
        return ipcRenderer.invoke(channel, data);
      }
      return Promise.reject(new Error(`Invalid channel: ${channel}`));
    },
    on: (channel, func) => {
      const validChannels = ['note-deleted', 'note-saved'];
      if (validChannels.includes(channel)) {
        const subscription = (_, ...args) => func(...args);
        ipcRenderer.on(channel, subscription);
        
        // Return unsubscribe function
        return () => {
          ipcRenderer.removeListener(channel, subscription);
        };
      }
    },
    removeAllListeners: (channel) => {
      const validChannels = ['note-deleted', 'note-saved'];
      if (validChannels.includes(channel)) {
        ipcRenderer.removeAllListeners(channel);
      }
    }
  }
});

// Keep legacy electronAPI for backward compatibility
contextBridge.exposeInMainWorld('electronAPI', {
  loadNotes: () => ipcRenderer.invoke('load-notes'),
  saveNotes: (notes) => ipcRenderer.invoke('save-notes', notes),
});
