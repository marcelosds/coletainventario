// baseSqlite.js
import * as SQLite from 'expo-sqlite/legacy';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { EventEmitter } from 'fbemitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// >>> Correção de acentuação (decodificação WIN1252)
import iconv from 'iconv-lite';
import { Buffer } from 'buffer';
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}
// <<<

const db = SQLite.openDatabase('inventario.db');
export const importEvents = new EventEmitter();

// ---------------------- Funções auxiliares ----------------------
/** Lê um arquivo texto como Base64 e decodifica em Windows-1252 */
async function readTextWin1252(uri) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const buf = Buffer.from(base64, 'base64');
  return iconv.decode(buf, 'win1252');
}

/** Código: remove zeros à esquerda; se ficar vazio, retorna '0' */
function normalizeCodigo(str) {
  const s = String(str || '').trim().replace(/^0+/, '');
  return s === '' ? '0' : s;
}

/** Placa: se vazio ou só zeros -> '', senão remove zeros à esquerda e mantém */
function normalizePlaca(str) {
  const raw = String(str || '').trim();
  if (raw === '') return '';
  const semZeros = raw.replace(/^0+/, '');
  // Se depois de remover os zeros também ficou vazio, significa "sem placa"
  return semZeros === '' ? '' : semZeros;
}

// ---------------------- Usuários ----------------------
export const createUserTable = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fullName TEXT,
        email TEXT UNIQUE,
        password TEXT
      );`
    );
  });
};

export const addUser = (fullName, email, password) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO users (fullName, email, password) VALUES (?, ?, ?);',
        [fullName, email, password],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const authenticateUser = (email, password) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? AND password = ?;',
        [email, password],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0));
          } else {
            resolve(null);
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

// ---------------------- Criação das tabelas ----------------------
export const initDB = () => {
  db.transaction(tx => {
     tx.executeSql(
      `DROP TABLE BENS;`
    );
    tx.e
    tx.executeSql(`CREATE TABLE IF NOT EXISTS BENS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      placa TEXT,
      descricao TEXT,
      localizacaoNome TEXT,
      estadoConservacaoNome TEXT,
      situacaoNome TEXT,
      codigoLocalizacao INTEGER,
      codigoEstado INTEGER,
      codigoSituacao INTEGER,
      StatusBem TEXT,
      dsObservacao TEXT
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS LOCAIS (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nome TEXT
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS ESTADO (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cdEstadoConser INTEGER UNIQUE,
      dsEstadoConser TEXT
    );`);

    tx.executeSql(`CREATE TABLE IF NOT EXISTS SITUACAO (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT,
      nome TEXT
    );`);
  },
  error => console.error("Erro ao criar tabelas:", error),
  () => {
    db.transaction(tx => {
      tx.executeSql(`SELECT COUNT(*) as total FROM ESTADO`, [], (_, { rows }) => {
        if (rows.item(0).total === 0) {
          const estados = [
            { cd: 1, ds: "Excelente" },
            { cd: 2, ds: "Bom" },
            { cd: 3, ds: "Regular" },
            { cd: 4, ds: "Péssimo" }
          ];
          estados.forEach(est => {
            tx.executeSql(
              "INSERT INTO ESTADO (cdEstadoConser, dsEstadoConser) VALUES (?, ?);",
              [est.cd, est.ds]
            );
          });
          console.log("Tabela ESTADO populada com valores padrão.");
        }
      });
    });
  });
};

// Inicializa banco
initDB();

// ---------------------- Importação ----------------------
export const importarArquivosTXT = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      type: 'text/plain'
    });

    if (result.canceled) {
      console.log("Importação cancelada.");
      return;
    }

    let fileBens, fileLocais, fileSituacao;
    result.assets.forEach(file => {
      const name = file.name.toUpperCase();
      if (name.includes("BENS")) fileBens = file;
      else if (name.includes("LOCAIS")) fileLocais = file;
      else if (name.includes("SITUACAO")) fileSituacao = file;
    });

    if (!fileBens || !fileLocais || !fileSituacao) {
      throw new Error("Todos os três arquivos (BENS, LOCAIS, SITUACAO) são necessários.");
    }

    //await limparTabelas();
    await importarLocais(fileLocais.uri);
    await importarSituacao(fileSituacao.uri);
    await importarBens(fileBens.uri);

    await AsyncStorage.setItem('isEnabled', 'true');
    console.log("✅ Importação concluída com sucesso.");
  } catch (err) {
    console.error("Erro na importação:", err);
  }
};

// ---------------------- Limpar tabelas (com reset de AUTOINCREMENT) ----------------------
export const limparTabelas = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Opcional: desabilita FKs enquanto limpa (SQLite no mobile costuma vir OFF por padrão)
      tx.executeSql('PRAGMA foreign_keys = OFF;');

      // Apaga dados
      tx.executeSql(
        "DELETE FROM BENS;",
        [],
        () => console.log("BENS: registros apagados."),
        (_, err) => { console.error("Erro ao limpar BENS:", err); return true; }
      );

      tx.executeSql(
        "DELETE FROM LOCAIS;",
        [],
        () => console.log("LOCAIS: registros apagados."),
        (_, err) => { console.error("Erro ao limpar LOCAIS:", err); return true; }
      );

      tx.executeSql(
        "DELETE FROM SITUACAO;",
        [],
        () => console.log("SITUACAO: registros apagados."),
        (_, err) => { console.error("Erro ao limpar SITUACAO:", err); return true; }
      );

      // Mantém a tabela ESTADO (padrões), mas se quiser limpar também, adicione aqui.

      // Reseta AUTOINCREMENT (sqlite_sequence)
      tx.executeSql(
        "DELETE FROM sqlite_sequence WHERE name IN ('BENS','LOCAIS','SITUACAO');",
        [],
        () => console.log("sqlite_sequence resetada para BENS/LOCAIS/SITUACAO."),
        (_, err) => { console.error("Erro ao resetar sqlite_sequence:", err); return true; }
      );

      // Reabilita FKs
      tx.executeSql('PRAGMA foreign_keys = ON;');
    },
    (err) => {
      // erro da transação
      console.error("Erro na transação de limpeza:", err);
      reject(err);
    },
    () => {
      console.log("✅ Limpeza concluída.");
      resolve();
    });
  });
};


// ---------------------- Importadores (com acentuação correta) ----------------------
const importarLocais = async (uri) => {
  const content = await readTextWin1252(uri);
  const linhas = content.split(/\r?\n/);
  db.transaction(tx => {
    linhas.forEach((linha, index) => {
      if (!linha.trim()) return;
      try {
        const codigo = linha.substring(0, 3).trim();
        const nome = linha.substring(3, 33).trim();
        tx.executeSql("INSERT INTO LOCAIS (codigo, nome) VALUES (?, ?)", [codigo, nome]);
      } catch (err) {
        console.error(`Erro LOCAIS linha ${index + 1}:`, err);
      }
    });
  });
};

const importarSituacao = async (uri) => {
  const content = await readTextWin1252(uri);
  const linhas = content.split(/\r?\n/);
  db.transaction(tx => {
    linhas.forEach((linha, index) => {
      if (!linha.trim()) return;
      try {
        const codigo = linha.substring(0, 2).trim();
        const nome = linha.substring(2, 32).trim();
        tx.executeSql("INSERT INTO SITUACAO (codigo, nome) VALUES (?, ?)", [codigo, nome]);
      } catch (err) {
        console.error(`Erro SITUACAO linha ${index + 1}:`, err);
      }
    });
  });
};

const importarBens = async (uri) => {
  const content = await readTextWin1252(uri);
  const linhas = content.split(/\r?\n/).filter(l => l.trim() !== '');
  importEvents.emit("progress", { total: linhas.length, current: 0 });

  let inseridos = 0;

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      linhas.forEach((linha, index) => {
        try {
          const codigo = normalizeCodigo(linha.substring(0, 10));
          const placa  = normalizePlaca(linha.substring(10, 22));
          const descricao             = linha.substring(22, 72).trim();
          const localizacaoNome       = linha.substring(72, 102).trim();
          const estadoConservacaoNome = linha.substring(102, 117).trim();
          const situacaoNome          = linha.substring(117, 147).trim();
          const codigoLocalizacao     = linha.substring(147, 150).trim();
          const codigoEstado          = linha.substring(150, 152).trim();
          const codigoSituacao        = linha.substring(152, 154).trim();

          tx.executeSql(
            `INSERT INTO BENS (
              codigo, placa, descricao, localizacaoNome, estadoConservacaoNome, situacaoNome,
              codigoLocalizacao, codigoEstado, codigoSituacao
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo, placa, descricao, localizacaoNome, estadoConservacaoNome, situacaoNome, codigoLocalizacao, codigoEstado, codigoSituacao],
            () => {
              inseridos++;
              if (inseridos % 100 === 0 || inseridos === linhas.length) {
                importEvents.emit("progress", { total: linhas.length, current: inseridos });
              }
            }
          );
        } catch (err) {
          console.error(`Erro BENS linha ${index + 1}:`, err);
        }
      });
    }, (err) => {
      const msg = `❌ Erro ao importar BENS: ${err?.message || err}`;
      console.error(msg);
      importEvents.emit("log", { message: msg });
      reject(err);
    }, () => {
      // transação finalizada
      const msg = `Bens Importados: ${inseridos}`;
      //console.log(msg);
      importEvents.emit("progress", { total: linhas.length, current: linhas.length });
      importEvents.emit("log", { message: msg });
      resolve({ inseridos, lidas: linhas.length });
    });
  });
};

// ---------------------- Consultas ----------------------
export const getBens = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM BENS;", [], (_, { rows }) => {
        resolve(rows._array);
      });
    }, reject);
  });
};

export const getLocais = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM LOCAIS;", [], (_, { rows }) => {
        resolve(rows._array);
      });
    }, reject);
  });
};

export const getSituacoes = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM SITUACAO;", [], (_, { rows }) => {
        resolve(rows._array);
      });
    }, reject);
  });
};

export const getEstados = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql("SELECT * FROM ESTADO;", [], (_, { rows }) => {
        resolve(rows._array);
      });
    }, reject);
  });
};

export const getLocalizaSQLite = (placaOuCodigo) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        "SELECT * FROM BENS WHERE placa = ? OR codigo = ? LIMIT 1",
        [placaOuCodigo, placaOuCodigo],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0));
          } else {
            reject(new Error("Bem não encontrado."));
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Salva os nomes exatamente como mostrados no combobox (se fornecidos)
export const atualizarInventario = (
  cdLocal,
  cdEstado,
  cdSituacao,
  obs,
  placaOuCodigo,
  status,
  nomes = {} // { localizacaoNome, estadoConservacaoNome, situacaoNome }
) => {
  const st = (status && String(status).trim() !== '') ? status : 'Bem Inventariado!';
  const observ = obs ?? '';

  const nmLocal  = typeof nomes.localizacaoNome === 'string' ? nomes.localizacaoNome.trim() : null;
  const nmEstado = typeof nomes.estadoConservacaoNome === 'string' ? nomes.estadoConservacaoNome.trim() : null;
  const nmSitu   = typeof nomes.situacaoNome === 'string' ? nomes.situacaoNome.trim() : null;

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `UPDATE BENS SET
           codigoLocalizacao     = ?,
           codigoEstado          = ?,
           codigoSituacao        = ?,
           StatusBem             = ?,
           dsObservacao          = ?,

           -- grava o texto exatamente como veio do combobox (se vier vazio/null, mantém o atual)
           localizacaoNome       = COALESCE(NULLIF(?, ''), localizacaoNome),
           estadoConservacaoNome = COALESCE(NULLIF(?, ''), estadoConservacaoNome),
           situacaoNome          = COALESCE(NULLIF(?, ''), situacaoNome)
         WHERE placa = ? OR codigo = ?`,
        [
          cdLocal, cdEstado, cdSituacao, st, observ,
          nmLocal, nmEstado, nmSitu,
          placaOuCodigo, placaOuCodigo
        ],
        (_, result) => resolve(result),
        (_, error)  => reject(error)
      );
    });
  });
};

