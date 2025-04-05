import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path, { join } from 'path';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(app.getPath('userData'), 'notesapp10.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err);
  } else {
    console.log('Banco de dados SQLite aberto com sucesso!');

    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content TEXT,
      updatedAt TEXT,
      coverImage TEXT
    )`);
  }
});

const migrateDatabase = () => {
  db.serialize(() => {
    db.all("PRAGMA table_info(notes)", (err, rows) => {
      if (err) {
        console.error("Erro ao verificar a tabela notes:", err);
        return;
      }

      const columns = rows.map((row) => row.name);
      if (!columns.includes("coverImage")) {
        console.log("Migrating database to add coverImage column...");
        db.run("ALTER TABLE notes RENAME TO notes_old", (err) => {
          if (err) {
            console.error("Erro ao renomear a tabela notes:", err);
            return;
          }

          db.run(
            `CREATE TABLE notes (
              id TEXT PRIMARY KEY,
              title TEXT,
              content TEXT,
              updatedAt TEXT,
              coverImage TEXT
            )`,
            (err) => {
              if (err) {
                console.error("Erro ao criar a nova tabela notes:", err);
                return;
              }

              db.run(
                `INSERT INTO notes (id, title, content, updatedAt)
                 SELECT id, title, content, updatedAt FROM notes_old`,
                (err) => {
                  if (err) {
                    console.error("Erro ao copiar dados para a nova tabela notes:", err);
                    return;
                  }

                  db.run("DROP TABLE notes_old", (err) => {
                    if (err) {
                      console.error("Erro ao excluir a tabela antiga notes_old:", err);
                    } else {
                      console.log("Migração concluída com sucesso!");
                    }
                  });
                }
              );
            }
          );
        });
      } else {
        console.log("A tabela notes já está atualizada.");
      }
    });
  });
};

const deletedNoteIds = new Set();

db.serialize(() => {
  migrateDatabase();
  
  db.run(`CREATE TABLE IF NOT EXISTS deleted_notes (
    id TEXT PRIMARY KEY,
    deletedAt TEXT
  )`);
  
  db.all('SELECT id FROM deleted_notes', [], (err, rows) => {
    if (err) {
      console.error('Error loading deleted note IDs:', err);
    } else {
      console.log(`Loaded ${rows.length} deleted note IDs`);
      rows.forEach(row => deletedNoteIds.add(row.id));
    }
  });
});

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'notes7.ico'), 
  });

  mainWindow.loadURL('http://localhost:5173'); 

  ipcMain.on('open-external-link', (_, url) => {
    console.log(`Opening external URL in default browser: ${url}`);
    shell.openExternal(url).catch(error => {
      console.error('Failed to open URL in external browser:', error);
    });
  });

  ipcMain.handle('load-notes', async () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM notes', [], (err, rows) => {
        if (err) {
          console.error('Erro ao carregar as notas:', err);
          reject(err);
        } else {
          const filteredRows = rows.filter((note) => !deletedNoteIds.has(note.id));
          resolve(filteredRows);
        }
      });
    });
  });

  ipcMain.on('save-notes', (_, notes) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)');

    notes.forEach((note) => {
      const updatedAt = note.updatedAt instanceof Date 
        ? note.updatedAt.toISOString() 
        : typeof note.updatedAt === 'string' 
          ? note.updatedAt 
          : new Date().toISOString();
          
      stmt.run(note.id, note.title, note.content, updatedAt, note.coverImage || null);
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('Erro ao finalizar a inserção das notas:', err);
      }
    });
  });

  ipcMain.on('save-note', (_, note) => {
    const stmt = db.prepare('INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)');
    
    const updatedAt = note.updatedAt instanceof Date 
      ? note.updatedAt.toISOString() 
      : typeof note.updatedAt === 'string' 
        ? note.updatedAt 
        : new Date().toISOString();
    
    stmt.run(note.id, note.title, note.content, updatedAt, note.coverImage || null);
    
    stmt.finalize((err) => {
      if (err) {
        console.error('Error finalizing note save:', err);
      }
    });
  });

  ipcMain.handle('save-note-sync', async (_, note) => {
    return new Promise((resolve, reject) => {
      const updatedAt = note.updatedAt instanceof Date 
        ? note.updatedAt.toISOString() 
        : typeof note.updatedAt === 'string' 
          ? note.updatedAt 
          : new Date().toISOString();
      
      db.run(
        'INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)',
        [note.id, note.title, note.content, updatedAt, note.coverImage || null],
        function(err) {
          if (err) {
            console.error('Error saving note:', err);
            reject(err);
          } else {
            resolve(true);
          }
        }
      );
    });
  });

  setInterval(() => {
    db.all('SELECT * FROM notes', [], (err, rows) => {
      if (err) {
        console.error('Erro ao carregar as notas para salvar:', err);
      } else {
        const filteredRows = rows.filter(note => !deletedNoteIds.has(note.id));
        
        const noteIdsToDelete = rows
          .filter(note => deletedNoteIds.has(note.id))
          .map(note => note.id);
          
        if (noteIdsToDelete.length > 0) {
          noteIdsToDelete.forEach(id => {
            db.run('DELETE FROM notes WHERE id = ?', [id]);
          });
        }
        
        ipcMain.emit('save-notes', [], filteredRows);
      }
    });
  }, 10000); 

  ipcMain.on('delete-note', (_, id) => {
    db.run('DELETE FROM notes WHERE id = ?', [id], function(err) {
      if (err) {
        console.error('Erro ao excluir nota:', err);
        return;
      }
      
      db.run(
        'INSERT OR REPLACE INTO deleted_notes (id, deletedAt) VALUES (?, ?)',
        [id, new Date().toISOString()],
        function(err) {
          if (err) {
            console.error('Error tracking deleted note ID:', err);
          } else {
            deletedNoteIds.add(id);
            
            if (mainWindow) {
              mainWindow.webContents.send('note-deleted', id);
            }
          }
        }
      );
    });
  });
});
