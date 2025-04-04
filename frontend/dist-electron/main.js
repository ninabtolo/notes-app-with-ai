import { app, BrowserWindow, ipcMain, shell } from "electron";
import path, { dirname, join } from "path";
import require$$0 from "fs";
import require$$2 from "events";
import require$$0$1 from "util";
import { fileURLToPath } from "url";
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var sqlite3$1 = { exports: {} };
function commonjsRequire(path2) {
  throw new Error('Could not dynamically require "' + path2 + '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.');
}
var bindings = { exports: {} };
var sep = path.sep || "/";
var fileUriToPath_1 = fileUriToPath;
function fileUriToPath(uri) {
  if ("string" != typeof uri || uri.length <= 7 || "file://" != uri.substring(0, 7)) {
    throw new TypeError("must pass in a file:// URI to convert to a file path");
  }
  var rest = decodeURI(uri.substring(7));
  var firstSlash = rest.indexOf("/");
  var host = rest.substring(0, firstSlash);
  var path2 = rest.substring(firstSlash + 1);
  if ("localhost" == host) host = "";
  if (host) {
    host = sep + sep + host;
  }
  path2 = path2.replace(/^(.+)\|/, "$1:");
  if (sep == "\\") {
    path2 = path2.replace(/\//g, "\\");
  }
  if (/^.+\:/.test(path2)) ;
  else {
    path2 = sep + path2;
  }
  return host + path2;
}
(function(module, exports) {
  var fs = require$$0, path$1 = path, fileURLToPath2 = fileUriToPath_1, join2 = path$1.join, dirname2 = path$1.dirname, exists = fs.accessSync && function(path2) {
    try {
      fs.accessSync(path2);
    } catch (e) {
      return false;
    }
    return true;
  } || fs.existsSync || path$1.existsSync, defaults = {
    arrow: process.env.NODE_BINDINGS_ARROW || " → ",
    compiled: process.env.NODE_BINDINGS_COMPILED_DIR || "compiled",
    platform: process.platform,
    arch: process.arch,
    nodePreGyp: "node-v" + process.versions.modules + "-" + process.platform + "-" + process.arch,
    version: process.versions.node,
    bindings: "bindings.node",
    try: [
      // node-gyp's linked version in the "build" dir
      ["module_root", "build", "bindings"],
      // node-waf and gyp_addon (a.k.a node-gyp)
      ["module_root", "build", "Debug", "bindings"],
      ["module_root", "build", "Release", "bindings"],
      // Debug files, for development (legacy behavior, remove for node v0.9)
      ["module_root", "out", "Debug", "bindings"],
      ["module_root", "Debug", "bindings"],
      // Release files, but manually compiled (legacy behavior, remove for node v0.9)
      ["module_root", "out", "Release", "bindings"],
      ["module_root", "Release", "bindings"],
      // Legacy from node-waf, node <= 0.4.x
      ["module_root", "build", "default", "bindings"],
      // Production "Release" buildtype binary (meh...)
      ["module_root", "compiled", "version", "platform", "arch", "bindings"],
      // node-qbs builds
      ["module_root", "addon-build", "release", "install-root", "bindings"],
      ["module_root", "addon-build", "debug", "install-root", "bindings"],
      ["module_root", "addon-build", "default", "install-root", "bindings"],
      // node-pre-gyp path ./lib/binding/{node_abi}-{platform}-{arch}
      ["module_root", "lib", "binding", "nodePreGyp", "bindings"]
    ]
  };
  function bindings2(opts) {
    if (typeof opts == "string") {
      opts = { bindings: opts };
    } else if (!opts) {
      opts = {};
    }
    Object.keys(defaults).map(function(i2) {
      if (!(i2 in opts)) opts[i2] = defaults[i2];
    });
    if (!opts.module_root) {
      opts.module_root = exports.getRoot(exports.getFileName());
    }
    if (path$1.extname(opts.bindings) != ".node") {
      opts.bindings += ".node";
    }
    var requireFunc = typeof __webpack_require__ === "function" ? __non_webpack_require__ : commonjsRequire;
    var tries = [], i = 0, l = opts.try.length, n, b, err;
    for (; i < l; i++) {
      n = join2.apply(
        null,
        opts.try[i].map(function(p) {
          return opts[p] || p;
        })
      );
      tries.push(n);
      try {
        b = opts.path ? requireFunc.resolve(n) : requireFunc(n);
        if (!opts.path) {
          b.path = n;
        }
        return b;
      } catch (e) {
        if (e.code !== "MODULE_NOT_FOUND" && e.code !== "QUALIFIED_PATH_RESOLUTION_FAILED" && !/not find/i.test(e.message)) {
          throw e;
        }
      }
    }
    err = new Error(
      "Could not locate the bindings file. Tried:\n" + tries.map(function(a) {
        return opts.arrow + a;
      }).join("\n")
    );
    err.tries = tries;
    throw err;
  }
  module.exports = exports = bindings2;
  exports.getFileName = function getFileName(calling_file) {
    var origPST = Error.prepareStackTrace, origSTL = Error.stackTraceLimit, dummy = {}, fileName;
    Error.stackTraceLimit = 10;
    Error.prepareStackTrace = function(e, st) {
      for (var i = 0, l = st.length; i < l; i++) {
        fileName = st[i].getFileName();
        if (fileName !== __filename) {
          if (calling_file) {
            if (fileName !== calling_file) {
              return;
            }
          } else {
            return;
          }
        }
      }
    };
    Error.captureStackTrace(dummy);
    dummy.stack;
    Error.prepareStackTrace = origPST;
    Error.stackTraceLimit = origSTL;
    var fileSchema = "file://";
    if (fileName.indexOf(fileSchema) === 0) {
      fileName = fileURLToPath2(fileName);
    }
    return fileName;
  };
  exports.getRoot = function getRoot(file) {
    var dir = dirname2(file), prev;
    while (true) {
      if (dir === ".") {
        dir = process.cwd();
      }
      if (exists(join2(dir, "package.json")) || exists(join2(dir, "node_modules"))) {
        return dir;
      }
      if (prev === dir) {
        throw new Error(
          'Could not find module root given file: "' + file + '". Do you have a `package.json` file? '
        );
      }
      prev = dir;
      dir = join2(dir, "..");
    }
  };
})(bindings, bindings.exports);
var bindingsExports = bindings.exports;
var sqlite3Binding = bindingsExports("node_sqlite3.node");
var trace = {};
var hasRequiredTrace;
function requireTrace() {
  if (hasRequiredTrace) return trace;
  hasRequiredTrace = 1;
  const util = require$$0$1;
  function extendTrace(object, property, pos) {
    const old = object[property];
    object[property] = function() {
      const error = new Error();
      const name = object.constructor.name + "#" + property + "(" + Array.prototype.slice.call(arguments).map(function(el) {
        return util.inspect(el, false, 0);
      }).join(", ") + ")";
      if (typeof pos === "undefined") pos = -1;
      if (pos < 0) pos += arguments.length;
      const cb = arguments[pos];
      if (typeof arguments[pos] === "function") {
        arguments[pos] = function replacement() {
          const err = arguments[0];
          if (err && err.stack && !err.__augmented) {
            err.stack = filter(err).join("\n");
            err.stack += "\n--> in " + name;
            err.stack += "\n" + filter(error).slice(1).join("\n");
            err.__augmented = true;
          }
          return cb.apply(this, arguments);
        };
      }
      return old.apply(this, arguments);
    };
  }
  trace.extendTrace = extendTrace;
  function filter(error) {
    return error.stack.split("\n").filter(function(line) {
      return line.indexOf(__filename) < 0;
    });
  }
  return trace;
}
(function(module, exports) {
  const path$1 = path;
  const sqlite32 = sqlite3Binding;
  const EventEmitter = require$$2.EventEmitter;
  module.exports = sqlite32;
  function normalizeMethod(fn) {
    return function(sql) {
      let errBack;
      const args = Array.prototype.slice.call(arguments, 1);
      if (typeof args[args.length - 1] === "function") {
        const callback = args[args.length - 1];
        errBack = function(err) {
          if (err) {
            callback(err);
          }
        };
      }
      const statement = new Statement(this, sql, errBack);
      return fn.call(this, statement, args);
    };
  }
  function inherits(target, source) {
    for (const k in source.prototype)
      target.prototype[k] = source.prototype[k];
  }
  sqlite32.cached = {
    Database: function(file, a, b) {
      if (file === "" || file === ":memory:") {
        return new Database(file, a, b);
      }
      let db2;
      file = path$1.resolve(file);
      if (!sqlite32.cached.objects[file]) {
        db2 = sqlite32.cached.objects[file] = new Database(file, a, b);
      } else {
        db2 = sqlite32.cached.objects[file];
        const callback = typeof a === "number" ? b : a;
        if (typeof callback === "function") {
          let cb = function() {
            callback.call(db2, null);
          };
          if (db2.open) process.nextTick(cb);
          else db2.once("open", cb);
        }
      }
      return db2;
    },
    objects: {}
  };
  const Database = sqlite32.Database;
  const Statement = sqlite32.Statement;
  const Backup = sqlite32.Backup;
  inherits(Database, EventEmitter);
  inherits(Statement, EventEmitter);
  inherits(Backup, EventEmitter);
  Database.prototype.prepare = normalizeMethod(function(statement, params) {
    return params.length ? statement.bind.apply(statement, params) : statement;
  });
  Database.prototype.run = normalizeMethod(function(statement, params) {
    statement.run.apply(statement, params).finalize();
    return this;
  });
  Database.prototype.get = normalizeMethod(function(statement, params) {
    statement.get.apply(statement, params).finalize();
    return this;
  });
  Database.prototype.all = normalizeMethod(function(statement, params) {
    statement.all.apply(statement, params).finalize();
    return this;
  });
  Database.prototype.each = normalizeMethod(function(statement, params) {
    statement.each.apply(statement, params).finalize();
    return this;
  });
  Database.prototype.map = normalizeMethod(function(statement, params) {
    statement.map.apply(statement, params).finalize();
    return this;
  });
  Database.prototype.backup = function() {
    let backup;
    if (arguments.length <= 2) {
      backup = new Backup(this, arguments[0], "main", "main", true, arguments[1]);
    } else {
      backup = new Backup(this, arguments[0], arguments[1], arguments[2], arguments[3], arguments[4]);
    }
    backup.retryErrors = [sqlite32.BUSY, sqlite32.LOCKED];
    return backup;
  };
  Statement.prototype.map = function() {
    const params = Array.prototype.slice.call(arguments);
    const callback = params.pop();
    params.push(function(err, rows) {
      if (err) return callback(err);
      const result = {};
      if (rows.length) {
        const keys = Object.keys(rows[0]);
        const key = keys[0];
        if (keys.length > 2) {
          for (let i = 0; i < rows.length; i++) {
            result[rows[i][key]] = rows[i];
          }
        } else {
          const value = keys[1];
          for (let i = 0; i < rows.length; i++) {
            result[rows[i][key]] = rows[i][value];
          }
        }
      }
      callback(err, result);
    });
    return this.all.apply(this, params);
  };
  let isVerbose = false;
  const supportedEvents = ["trace", "profile", "change"];
  Database.prototype.addListener = Database.prototype.on = function(type) {
    const val = EventEmitter.prototype.addListener.apply(this, arguments);
    if (supportedEvents.indexOf(type) >= 0) {
      this.configure(type, true);
    }
    return val;
  };
  Database.prototype.removeListener = function(type) {
    const val = EventEmitter.prototype.removeListener.apply(this, arguments);
    if (supportedEvents.indexOf(type) >= 0 && !this._events[type]) {
      this.configure(type, false);
    }
    return val;
  };
  Database.prototype.removeAllListeners = function(type) {
    const val = EventEmitter.prototype.removeAllListeners.apply(this, arguments);
    if (supportedEvents.indexOf(type) >= 0) {
      this.configure(type, false);
    }
    return val;
  };
  sqlite32.verbose = function() {
    if (!isVerbose) {
      const trace2 = requireTrace();
      [
        "prepare",
        "get",
        "run",
        "all",
        "each",
        "map",
        "close",
        "exec"
      ].forEach(function(name) {
        trace2.extendTrace(Database.prototype, name);
      });
      [
        "bind",
        "get",
        "run",
        "all",
        "each",
        "map",
        "reset",
        "finalize"
      ].forEach(function(name) {
        trace2.extendTrace(Statement.prototype, name);
      });
      isVerbose = true;
    }
    return sqlite32;
  };
})(sqlite3$1);
var sqlite3Exports = sqlite3$1.exports;
const sqlite3 = /* @__PURE__ */ getDefaultExportFromCjs(sqlite3Exports);
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename$1);
const dbPath = join(app.getPath("userData"), "notesapp2.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Erro ao abrir o banco de dados:", err);
  } else {
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
        db.run("ALTER TABLE notes RENAME TO notes_old", (err2) => {
          if (err2) {
            console.error("Erro ao renomear a tabela notes:", err2);
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
            (err3) => {
              if (err3) {
                console.error("Erro ao criar a nova tabela notes:", err3);
                return;
              }
              db.run(
                `INSERT INTO notes (id, title, content, updatedAt)
                 SELECT id, title, content, updatedAt FROM notes_old`,
                (err4) => {
                  if (err4) {
                    console.error("Erro ao copiar dados para a nova tabela notes:", err4);
                    return;
                  }
                  db.run("DROP TABLE notes_old", (err5) => {
                    if (err5) {
                      console.error("Erro ao excluir a tabela antiga notes_old:", err5);
                    }
                  });
                }
              );
            }
          );
        });
      }
    });
  });
};
const deletedNoteIds = /* @__PURE__ */ new Set();
db.serialize(() => {
  migrateDatabase();
  db.run(`CREATE TABLE IF NOT EXISTS deleted_notes (
    id TEXT PRIMARY KEY,
    deletedAt TEXT
  )`);
  db.all("SELECT id FROM deleted_notes", [], (err, rows) => {
    if (err) {
      console.error("Error loading deleted note IDs:", err);
    } else {
      rows.forEach((row) => deletedNoteIds.add(row.id));
    }
  });
});
let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js")
    },
    icon: path.join(__dirname, "assets", "notes7.ico")
  });
  const isDev = process.env.NODE_ENV === "development";
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}
app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
ipcMain.on("open-external-link", (_, url) => {
  if (!url || typeof url !== "string") return;
  try {
    const urlObj = new URL(url);
    if (urlObj.protocol === "http:" || urlObj.protocol === "https:") {
      shell.openExternal(url).catch((error) => {
        console.error("Failed to open URL in external browser:", error);
      });
    } else {
      console.warn(`Blocked attempt to open URL with disallowed protocol: ${urlObj.protocol}`);
    }
  } catch (error) {
    console.error("Invalid URL format:", error);
  }
});
ipcMain.handle("load-notes", async () => {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM notes", [], (err, rows) => {
      if (err) {
        console.error("Erro ao carregar as notas:", err);
        reject(err);
      } else {
        const filteredRows = rows.filter((note) => !deletedNoteIds.has(note.id));
        resolve(filteredRows);
      }
    });
  });
});
ipcMain.on("save-notes", (_, notes) => {
  const stmt = db.prepare("INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)");
  notes.forEach((note) => {
    const updatedAt = note.updatedAt instanceof Date ? note.updatedAt.toISOString() : typeof note.updatedAt === "string" ? note.updatedAt : (/* @__PURE__ */ new Date()).toISOString();
    stmt.run(note.id, note.title, note.content, updatedAt, note.coverImage || null);
  });
  stmt.finalize((err) => {
    if (err) {
      console.error("Erro ao finalizar a inserção das notas:", err);
    }
  });
});
ipcMain.on("save-note", (_, note) => {
  const stmt = db.prepare("INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)");
  const updatedAt = note.updatedAt instanceof Date ? note.updatedAt.toISOString() : typeof note.updatedAt === "string" ? note.updatedAt : (/* @__PURE__ */ new Date()).toISOString();
  stmt.run(note.id, note.title, note.content, updatedAt, note.coverImage || null);
  stmt.finalize((err) => {
    if (err) {
      console.error("Error finalizing note save:", err);
    }
  });
});
ipcMain.handle("save-note-sync", async (_, note) => {
  return new Promise((resolve, reject) => {
    const updatedAt = note.updatedAt instanceof Date ? note.updatedAt.toISOString() : typeof note.updatedAt === "string" ? note.updatedAt : (/* @__PURE__ */ new Date()).toISOString();
    db.run(
      "INSERT OR REPLACE INTO notes (id, title, content, updatedAt, coverImage) VALUES (?, ?, ?, ?, ?)",
      [note.id, note.title, note.content, updatedAt, note.coverImage || null],
      function(err) {
        if (err) {
          console.error("Error saving note:", err);
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
});
setInterval(() => {
  db.all("SELECT * FROM notes", [], (err, rows) => {
    if (err) {
      console.error("Erro ao carregar as notas para salvar:", err);
    } else {
      const filteredRows = rows.filter((note) => !deletedNoteIds.has(note.id));
      const noteIdsToDelete = rows.filter((note) => deletedNoteIds.has(note.id)).map((note) => note.id);
      if (noteIdsToDelete.length > 0) {
        noteIdsToDelete.forEach((id) => {
          db.run("DELETE FROM notes WHERE id = ?", [id]);
        });
      }
      ipcMain.emit("save-notes", [], filteredRows);
    }
  });
}, 1e4);
ipcMain.on("delete-note", (_, id) => {
  db.run("DELETE FROM notes WHERE id = ?", [id], function(err) {
    if (err) {
      console.error("Erro ao excluir nota:", err);
      return;
    }
    db.run(
      "INSERT OR REPLACE INTO deleted_notes (id, deletedAt) VALUES (?, ?)",
      [id, (/* @__PURE__ */ new Date()).toISOString()],
      function(err2) {
        if (err2) {
          console.error("Error tracking deleted note ID:", err2);
        } else {
          deletedNoteIds.add(id);
          if (mainWindow) {
            mainWindow.webContents.send("note-deleted", id);
          }
        }
      }
    );
  });
});
