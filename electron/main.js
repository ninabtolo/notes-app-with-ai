const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Melhorar o handler para debug e robustez
ipcMain.on('open-external-link', (_, url) => {
  console.log('Main process received open-external-link request:', url);
  
  if (url && typeof url === 'string') {
    // Validar URL para evitar problemas de segurança
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
        console.log(`Opening external URL: ${url}`);
        shell.openExternal(url).then(() => {
          console.log(`URL successfully opened: ${url}`);
        }).catch(err => {
          console.error(`Failed to open URL: ${url}`, err);
        });
      } else {
        console.warn(`Blocked attempt to open URL with disallowed protocol: ${urlObj.protocol}`);
      }
    } catch (error) {
      console.error('Invalid URL format:', error);
    }
  } else {
    console.error('Invalid URL provided to open-external-link');
  }
});