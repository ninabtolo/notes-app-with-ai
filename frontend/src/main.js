import { app, BrowserWindow, ipcMain } from 'electron';
import { join } from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(app.getPath('userData'), 'notesapp.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err);
  } else {
    console.log('Banco de dados SQLite aberto com sucesso!');

    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updatedAt TEXT
    )`);
  }
});

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL('http://localhost:5173'); 

  ipcMain.handle('load-notes', async () => {
    console.log('Carregando notas do banco de dados...');
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM notes', [], (err, rows) => {
        if (err) {
          console.error('Erro ao carregar as notas:', err);
          reject(err);
        } else {
          console.log(`Notas carregadas com sucesso: ${rows.length} notas encontradas.`);
          resolve(rows);
        }
      });
    });
  });

  ipcMain.on('save-notes', (_, notes) => {
    console.log(`Salvando ${notes.length} notas no banco de dados...`);
    const stmt = db.prepare('INSERT OR REPLACE INTO notes (id, title, content, updatedAt) VALUES (?, ?, ?, ?)');

    notes.forEach((note) => {
      const updatedAt = new Date().toISOString();
      console.log(`Salvando nota com ID: ${note.id}`);
      stmt.run(note.id, note.title, note.content, updatedAt);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Erro ao finalizar a inserção das notas:', err);
      } else {
        console.log('Notas salvas com sucesso!');
      }
    });
  });

  setInterval(() => {
    console.log('Salvando notas automaticamente...');
    db.all('SELECT * FROM notes', [], (err, rows) => {
      if (err) {
        console.error('Erro ao carregar as notas para salvar:', err);
      } else {
        ipcMain.emit('save-notes', [], rows); 
      }
    });
  }, 10000); 

  ipcMain.on('delete-note', (_, id) => {
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    stmt.run(id, (err) => {
      if (err) {
        console.error('Erro ao excluir nota:', err);
      }
    });
  });
});
