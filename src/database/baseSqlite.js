import * as SQLite from 'expo-sqlite/legacy';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';



// Configuração do banco de dados
const db = SQLite.openDatabase('inventario.db');

// Função para criar a tabela de usuários
export const createUserTable = () => {
  db.transaction(tx => {
    //tx.executeSql(
      //`DROP TABLE users;`
   // );
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



// Função para adicionar um novo usuário
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


// Função para verificar credenciais do usuário
export const authenticateUser = (email, password) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? AND password = ?;',
        [email, password],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0)); // Retorna o usuário se encontrado
          } else {
            resolve(null); // Nenhum usuário encontrado
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};


export const handleLimpar = () => {
  Alert.alert(
    "Confirmação?",
    "Você tem certeza que deseja limpar base de dados do coletor?",
    [
      {
        text: "Cancelar",
        onPress: () => console.log("Cancelado"),
        style: "cancel"
      },
      {
        text: "Confirmar",
        onPress: (excluirTabela),
        style: "default"
      }
    ]
  );
};

// Criação da tabela INVENTARIOITEM
export const createTable = () => {
  db.transaction(tx => {
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS INVENTARIOITEM (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cdItem INTEGER,
        nrPlaca TEXT,
        dsReduzida TEXT,
        cdLocalizacaoReal INTEGER,
        dsLocalizacao TEXT,
        cdEstadoConserReal INTEGER,
        dsEstadoConser TEXT,
        cdSituacaoAtual INTEGER,
        dsSituacao TEXT,
        vlAtual REAL,
        dsObservacao TEXT,
        cdInventario INTEGER,
        cdAlteracao INTEGER,
        stInventario INTEGER
      )`,
      [],
      () => {
        console.log("Tabela INVENTARIOITEM criada com sucesso!");
      },
      error => {
        console.error("Erro ao criar tabela: ", error);
      }
    );
  });
};

// Criação das tabelas LOCALIZAÇÃO e SITUAÇÃO
export const createTables = () => {
  db.transaction(tx => {
    tx.executeSql(
      `DROP TABLE IF EXISTS LOCALIZACAO`,
      [],
      () => {
        console.log("Tabela LOCALIZACAO excluída (se existia).");
      },
      error => {
        console.error("Erro ao excluir tabela: ", error);
      }
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS LOCALIZACAO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cdLocalReduzido INTEGER,
        dsLocalizacao TEXT       
      )`,
      [],
      () => {
        console.log("Tabela LOCALIZACAO criada com sucesso!");
      },
      error => {
        console.error("Erro ao criar tabela: ", error);
      }
    );
    tx.executeSql(
      `DROP TABLE IF EXISTS SITUACAO`,
      [],
      () => {
        console.log("Tabela SITUAÇÃO excluída (se existia).");
      },
      error => {
        console.error("Erro ao excluir tabela: ", error);
      }
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS SITUACAO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cdSituacaoReduzido INTEGER,
        dsSituacao TEXT       
      )`,
      [],
      () => {
        console.log("Tabela SITUAÇÃO criada com sucesso!");
      },
      error => {
        console.error("Erro ao criar tabela: ", error);
      }
    );
    tx.executeSql(
      `DROP TABLE IF EXISTS ESTADO`,
      [],
      () => {
        console.log("Tabela ESTADO excluída (se existia).");
      },
      error => {
        console.error("Erro ao excluir tabela: ", error);
      }
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS ESTADO (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cdEstadoConser INTEGER,
        dsEstadoConser TEXT       
      )`,
      [],
      () => {
        console.log("Tabela ESTADO criada com sucesso!");
      },
      error => {
        console.error("Erro ao criar tabela: ", error);
      }
    );
  });
};

// Primeiro, exclui a tabela se ela já existir
export const excluirTabela = () => {
  db.transaction(tx => {
    tx.executeSql(
      `DROP TABLE IF EXISTS INVENTARIOITEM`,
      [],
      () => {
        console.log("Tabela INVENTARIOITEM excluída (se existia).");
      },
      error => {
        console.error("Erro ao excluir tabela: ", error);
      }
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS INVENTARIOITEM (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cdItem INTEGER,
        nrPlaca TEXT,
        dsReduzida TEXT,
        cdLocalizacaoReal INTEGER,
        dsLocalizacao TEXT,
        cdEstadoConserReal INTEGER,
        dsEstadoConser TEXT,
        cdSituacaoAtual INTEGER,
        dsSituacao TEXT,
        vlAtual REAL,
        dsObservacao TEXT,
        cdInventario INTEGER,
        cdAlteracao INTEGER,
        stInventario INTEGER
      )`,
      [],
      () => {
        console.log("Tabela INVENTARIOITEM criada com sucesso!");
      },
      error => {
        console.error("Erro ao criar tabela: ", error);
      }
    );
  });
};

// Carrega os bens da base do servidor para a base do coletor
export const carregaData = async () => {

  createTables();

    const json = await AsyncStorage.getItem('inventario');
    const inventario = JSON.parse(json);

    if (inventario) {
        const api = (inventario.apiLink);
        const codigo = (inventario.codigoInventario.toString());
        const ug = (inventario.codigoUnidadeGestora.toString());

        const token = await AsyncStorage.getItem('userToken');

        const response = await axios.get(`${api}/benssqlite/${codigo}`, {
          headers: { Authorization: token },
        }); // Endpoint da API

        const locais = await axios.get(`${api}/locais`, {
          headers: { Authorization: token },
        });  

        
        const situacao = await axios.get(`${api}/situacao`, {
          headers: { Authorization: token },
        }); 


        const estado = await axios.get(`${api}/estado`, {
          headers: { Authorization: token },
        });  


        importDataToSQLite(response.data); // Importa os dados para o SQLite após definir bens

        importLocais(locais.data);

        importSituacao(situacao.data);

        importEstado(estado.data);

    }  
    
};
  

//Carregar dados do servidor no dispositivo - SQLite
const importDataToSQLite = (bens) => {
  db.transaction(tx => {
    bens.forEach(item => {
      // Verificar se o cdInventario já existe
      tx.executeSql(
        `SELECT COUNT(*) FROM INVENTARIOITEM WHERE cdInventario = ?`,
        [item.cdInventario],
        (tx, results) => {
          const count = results.rows.item(0)['COUNT(*)'];
          if (count === 0) { // Se não existir, insira os dados
            tx.executeSql(
              `INSERT INTO INVENTARIOITEM (cdItem, nrPlaca, dsReduzida, cdLocalizacaoReal, dsLocalizacao, cdEstadoConserReal, dsEstadoConser, cdSituacaoAtual, dsSituacao, vlAtual, dsObservacao, cdInventario, cdAlteracao, stInventario)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.cdItem,
                item.nrPlaca,
                item.dsReduzida,
                item.cdLocalizacaoReal,
                item.dsLocalizacao,
                item.cdEstadoConserReal,
                item.dsEstadoConser,
                item.cdSituacaoAtual,
                item.dsSituacao,
                item.vlAtual,
                item.dsObservacao,
                item.cdInventario,
                item.cdAlteracao,
                item.stInventario,
              ],
              () => {
                //console.log(`Inventário ${item.cdInventario} importado com sucesso.`);
              },
              error => {
                console.error("Erro ao importar inventários: ", error);
              }
            );
          } else {
            //console.log(`Inventário ${item.cdInventario} já existe. Nenhuma inserção feita.`);
          }
        },
        error => {
          console.error("Erro ao verificar a existência do inventário: ", error);
        }
      );
    });
    
    // Exibe um alerta após todos os itens terem sido processados
    Alert.alert('Informação:', 'Processamento concluído com sucesso!');
  });
};


//Carregar localizações do servidor no dispositivo - SQLite
const importLocais = (local) => {
  db.transaction(tx => {
    local.forEach(item => {
      tx.executeSql(
        `INSERT INTO LOCALIZACAO (cdLocalReduzido, dsLocalizacao)
        VALUES (?, ?)`,
        [
          item.cdLocalReduzido,
          item.dsLocalizacao,
        ],
        () => {

        },
        error => {
          console.error("Erro ao importar locais: ", error);
        }
      );
    });
    //Alert.alert('Informação:', 'Locais importados para o Coletor com sucesso!')
  });
};

//Carregar situações do servidor no dispositivo - SQLite
const importSituacao = (situacao) => {
  db.transaction(tx => {
    situacao.forEach(item => {
      tx.executeSql(
        `INSERT INTO SITUACAO (cdSituacaoReduzido, dsSituacao)
        VALUES (?, ?)`,
        [
          item.cdSituacaoReduzido,
          item.dsSituacao,
        ],
        () => {

        },
        error => {
          console.error("Erro ao importar situações: ", error);
        }
      );
    });
    //Alert.alert('Informação:', 'Situações importadas para o Coletor com sucesso!')
  });
}; 


//Carregar estados de conservação do servidor no dispositivo - SQLite
const importEstado = (estado) => {
  db.transaction(tx => {
    estado.forEach(item => {
      tx.executeSql(
        `INSERT INTO ESTADO (cdEstadoConser, dsEstadoConser)
        VALUES (?, ?)`,
        [
          item.cdEstadoConser,
          item.dsEstadoConser,
        ],
        () => {

        },
        error => {
          console.error("Erro ao importar estados: ", error);
        }
      );
    });
    //Alert.alert('Informação:', 'Situações importadas para o Coletor com sucesso!')
  });
}; 

// Enviar atualizações do SQlite local para o servidor
export const syncDataWithServer = async () => {

  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);

  // Obter dados do SQLite
  db.transaction(tx => {
      tx.executeSql(`SELECT * FROM INVENTARIOITEM WHERE cdInventario = ?`, [inventario.codigoInventario], async (tx, results) => {
          const itemsToUpdate = [];
          
          for (let i = 0; i < results.rows.length; i++) {
              const item = results.rows.item(i);
              
              // Monta o objeto de item na estrutura desejada
              const novoItem = {
                  cdItem: item.cdItem, // Passa o ID do código
                  cdLocalizacaoReal: item.cdLocalizacaoReal, // Passa o ID da localização
                  cdEstadoConserReal: item.cdEstadoConserReal, // Passa o ID da estado
                  cdSituacaoAtual: item.cdSituacaoAtual, // Passa o ID da situação
                  cdAlteracao: item.cdAlteracao, // Passa o ID da situação
                  dsObservacao: item.dsObservacao
              };
              //console.log(novoItem);
              itemsToUpdate.push(novoItem); // Adiciona o novo item ao array
          }

          // Formata o array de itens neste formato
          const dadosParaEnviar = { itens: itemsToUpdate };

          // Aqui a lógica para verificar se a API está online
          if (inventario) {
              const api = (inventario.apiLink);
              const codigo = (inventario.codigoInventario);
              const token = await AsyncStorage.getItem('userToken');
              
              try {
                  // Envia os dados para o servidor
                  await axios.put(`${api}/base/${codigo}`, dadosParaEnviar, {
                    headers: { Authorization: token },
                  });
                  Alert.alert('Informação:', 'Inventários atualizados no servidor com sucesso!')
              } catch (error) {
                Alert.alert('Atenção', 'Erro ao sincronizar itens, tente novamente!')
              }
          }          
      });
  });
};

// Função para usar o SQLite e obter os itens da tabela INVENTARIOITEM
export const getItemsFromSQLite = async () => {
  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);
  return new Promise((resolve, reject) => {
      db.transaction(tx => {
          tx.executeSql(
              `SELECT cdItem,
                      nrPlaca,
                      dsReduzida,
                      cdLocalizacaoReal,
                      dsLocalizacao,
                      cdEstadoConserReal,
                      dsEstadoConser,
                      cdSituacaoAtual,
                      dsSituacao,
                      vlAtual,
                      dsObservacao,
                      cdInventario,
                      CASE WHEN cdAlteracao IS NULL THEN '' ELSE 'BEM JÁ INVENTARIADO!' END AS StatusBem,
                      stInventario FROM INVENTARIOITEM WHERE cdInventario = ${inventario.codigoInventario}`, // Selecione conforme necessário
              [],
              (_, { rows }) => {
                  resolve(rows._array); // Retorna os itens encontrados
              },
              (tx, error) => {
                  reject(error); // Lida com erros
              }
          );
      });
  });
};

// Função para usar o SQLite e gerar a lista de bens do inventário offline
export const getItemsSQLite = async () => {
  try {
    const json = await AsyncStorage.getItem('inventario');
    const inventario = JSON.parse(json);

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT I.cdItem,
                  I.nrPlaca,
                  I.dsReduzida,
                  L.dsLocalizacao AS dsLocalizacao,
                  E.dsEstadoConser as dsEstadoConser,
                  S.dsSituacao AS dsSituacao,
                  I.vlAtual,
                  CASE WHEN I.cdAlteracao IS NULL THEN '' ELSE 'BEM JÁ INVENTARIADO!' END AS StatusBem
           FROM INVENTARIOITEM I
           INNER JOIN LOCALIZACAO L ON I.cdLocalizacaoReal = L.cdLocalReduzido
           INNER JOIN SITUACAO S ON I.cdSituacaoAtual = S.cdSituacaoReduzido
           INNER JOIN ESTADO E ON I.cdEstadoConserReal = E.cdEstadoConser
           WHERE I.cdInventario = ?`, // Usando placeholders para segurança
          [inventario.codigoInventario], // Passando o valor como segundo argumento
          (_, { rows }) => {
            // Resolvendo a Promise com os itens encontrados
            resolve(rows._array);
          },
          (tx, error) => {
            console.error("Erro ao buscar itens:", error);
            reject(error); // Rejeita a Promise em caso de erro
          }
        );
      });
    });
    
  } catch (error) {
    console.error("Erro ao obter o inventário:", error);
    throw error; // Propaga o erro ao chamador
  }
};


// função para buscar na base do SQLITE todas as localizações
export const getLocais = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Realiza a consulta SQL para obter os campos desejados
      tx.executeSql(
        `SELECT dsLocalizacao, cdLocalReduzido FROM LOCALIZACAO`, // A consulta SQL
        [],
        (_, { rows }) => {
          const locaisArray = [];
          
          // Transforma as linhas obtidas em um array
          for (let i = 0; i < rows.length; i++) {
            const { dsLocalizacao, cdLocalReduzido } = rows.item(i);
            locaisArray.push({ dsLocalizacao, cdLocalReduzido }); // Adiciona ao array
          }

          resolve(locaisArray); // Resolva a promessa com o array de locais
        },
        (_, error) => {
          console.error("Erro ao extrair dados:", error);
          reject(error); // Rejeita a promessa em caso de erro
        }
      );
    });
  });
};

// função para buscar na base do SQLITE situação do inventario
export const getSituacao = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Realiza a consulta SQL para obter os campos desejados
      tx.executeSql(
        `SELECT dsSituacao, cdSituacaoReduzido FROM SITUACAO`, // A consulta SQL
        [],
        (_, { rows }) => {
          const situacaoArray = [];
          
          // Transforma as linhas obtidas em um array
          for (let i = 0; i < rows.length; i++) {
            const { dsSituacao, cdSituacaoReduzido } = rows.item(i);
            situacaoArray.push({ dsSituacao, cdSituacaoReduzido }); // Adiciona ao array
          }

          resolve(situacaoArray); // Resolva a promessa com o array de situações
        },
        (_, error) => {
          console.error("Erro ao extrair dados:", error);
          reject(error); // Rejeita a promessa em caso de erro
        }
      );
    });
  });
};


// função para buscar na base do SQLITE situação do inventario
export const getEstados = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Realiza a consulta SQL para obter os campos desejados
      tx.executeSql(
        `SELECT dsEstadoConser, cdEstadoConser FROM ESTADO`, // A consulta SQL
        [],
        (_, { rows }) => {
          const estadoArray = [];
          
          // Transforma as linhas obtidas em um array
          for (let i = 0; i < rows.length; i++) {
            const { dsEstadoConser, cdEstadoConser } = rows.item(i);
            estadoArray.push({ dsEstadoConser, cdEstadoConser }); // Adiciona ao array
          }

          resolve(estadoArray); // Resolva a promessa com o array de estados de conservação
        },
        (_, error) => {
          console.error("Erro ao extrair dados:", error);
          reject(error); // Rejeita a promessa em caso de erro
        }
      );
    });
  });
};


// função para buscar na base do SQLITE total de bens do inventário
export const getTotalItensInven = async () => {
  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);
  return new Promise((resolve, reject) => {
      db.transaction(tx => {
          tx.executeSql(
              `SELECT COUNT(*) as total FROM INVENTARIOITEM WHERE cdInventario = ${inventario.codigoInventario}`, // Consulta para contar todos os registros
              [],
              (_, { rows }) => {
                  if (rows.length > 0) {
                      resolve(rows.item(0).total); // Retorna o total encontrado
                  } else {
                      resolve(0); // Se a tabela estiver vazia, retorna 0
                  }
              },
              (_, error) => {
                  console.error("Erro ao buscar total de itens:", error);
                  reject(error); // Rejeita a promessa em caso de erro
              }
          );
      });
  });
};

// função para buscar na base do SQLITE total de bens inventariados
export const getInventariados = async () => {
  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT COUNT(*) as total FROM INVENTARIOITEM WHERE cdAlteracao IS NOT NULL AND cdInventario = ${inventario.codigoInventario}`,
        [],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0).total);
          } else {
            resolve(0);
          }
        },
        (tx, error) => {
          console.error("Erro ao buscar inventariados:", error);
          reject(error);
        }
      );
    });
  });
};

// Função para obter da base local a situação do inventário
export const getSituacaoInven = async () => {
  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);

  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT stInventario FROM INVENTARIOITEM WHERE cdInventario = ? LIMIT 1`, // Usando LIMIT 1 para garantir que apenas uma entrada é retornada
        [inventario.codigoInventario], // Bind de parâmetro para segurança
        (_, { rows }) => {
          if (rows.length > 0) {
            const situacaoInventario = rows.item(0).stInventario; // Obtém a primeira instância
            resolve(situacaoInventario); // Retorna a situação do inventário
          } else {
            resolve(null); // Retorna null se não encontrar
          }
        },
        (_, error) => {
          console.error("Erro ao buscar situação do inventário:", error);
          reject(error); // Rejeita a promessa em caso de erro
        }
      );
    });
  });
};


// Função para atualizar os bens na base sqlite após gravar alterações
export const atualizarInventario = async (cdLocalizacaoReal, cdEstadoConserReal, cdSituacaoAtual, dsObservacao, placaInput, invent) => {
    return new Promise((resolve, reject) => {
        // Iniciar a transação
        db.transaction(tx => {
            tx.executeSql(
                `UPDATE INVENTARIOITEM 
                 SET cdLocalizacaoReal = ? , 
                     cdEstadoConserReal = ? , 
                     cdSituacaoAtual = ? ,
                     dsObservacao = ?, 
                     cdAlteracao = CASE WHEN ? = '' THEN 3 ELSE 2 END 
                 WHERE nrPlaca = ? OR cdItem = ? AND cdInventario = ?`,
                [cdLocalizacaoReal, cdEstadoConserReal, cdSituacaoAtual, dsObservacao, dsObservacao, placaInput, placaInput, invent],
                (_, result) => {
                    // Verifica se alguma linha foi afetada
                    if (result.rowsAffected > 0) {
                        resolve("Atualização realizada com sucesso."); // Resolva a promessa se a atualização tiver sucesso
                    } else {
                        //console.log("Nenhum item encontrado para atualizar.");
                        resolve("Nenhum item encontrado para atualizar."); // Resolve com uma mensagem se nenhum item foi encontrado
                    }
                },
                (tx, error) => {
                    console.error("Erro ao atualizar os dados:", error);
                    reject(error); // Rejeita a promessa se ocorrer um erro
                }
            );
        });
    });
};


// Função para localizar um bem na base sqlite
export const getLocalizaSQLite = async (placa) => {
  const json = await AsyncStorage.getItem('inventario');
  const inventario = JSON.parse(json);

  return new Promise((resolve, reject) => {
      db.transaction(tx => {
          tx.executeSql(
              `SELECT cdItem,
                      nrPlaca,
                      dsReduzida,
                      cdLocalizacaoReal,
                      dsLocalizacao,
                      cdEstadoConserReal,
                      dsEstadoConser,
                      cdSituacaoAtual,
                      dsSituacao,
                      vlAtual,
                      dsObservacao,
                      cdInventario,
                      CASE WHEN cdAlteracao IS NULL THEN '' ELSE 'BEM JÁ INVENTARIADO!' END AS StatusBem,
                      stInventario 
               FROM INVENTARIOITEM 
               WHERE nrPlaca = ? OR cdItem = ? AND cdInventario = ?`, // Use placeholders (?) para segurança
              [placa, placa, inventario.codigoInventario],
              (_, { rows }) => {
                  if (rows.length > 0) {
                      resolve(rows.item(0)); // Retorna o primeiro item encontrado, se existir
                  } else {
                      resolve(null); // Retorna null se não houver resultados
                  }
              },
              (tx, error) => {
                  reject(error); // Lida com erros
              }
          );
      });
  });
};


// Verifica se o usuário existe
export const recuperarSenha = async (email, novaSenha) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Verifica se o e-mail existe
      tx.executeSql(
        'SELECT * FROM users WHERE email = ?',
        [email],
        (_, { rows }) => {
          if (rows.length > 0) {
            // Se o usuário existe, atualiza a senha
            tx.executeSql(
              'UPDATE users SET password = ? WHERE email = ?',
              [novaSenha, email],
              () => {
                resolve('Senha atualizada com sucesso!');
              },
              (_, error) => {
                console.error('Erro ao atualizar a senha:', error);
                reject('Erro ao atualizar a senha.');
              }
            );
          } else {
            console.log('Usuário não encontrado.');
            resolve('Usuário não encontrado.'); // Não existe o email
          }
        },
        (_, error) => {
          console.error('Erro ao buscar usuário:', error);
          reject('Erro ao buscar usuário.');
        }
      );
    });
  });
};


// Função para obter o ID do usuário pelo e-mail
export const getUserIdByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT id FROM users WHERE email = ?;',
        [email],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0).id); // Retorna apenas o valor de 'id'

            excluirUsuarioPorEmail(email);

            navigation.navigate('Login'); // Navegue para a tela de login

          } else {
            resolve(null); // Nenhum usuário encontrado
            Alert.alert('Erro:', 'Nenhum usuário encontrado!');
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};



// Excluir usuário com base no ID conectado
export const excluirUsuarioPorEmail = async (email) => {
    try {
        const userId = await getUserIdByEmail(email); // Função que obtém o ID do usuário pelo e-mail

        if (userId) {

            await deleteUserById(userId);
            
        } 
    } catch (error) {
        console.error("Erro ao excluir usuário:", error);
    }
};


// Excluir o usuário da tabela
export const deleteUserById = async (userId) => {
  return new Promise((resolve, reject) => {
      // Iniciar a transação
      db.transaction(tx => {
          tx.executeSql(
              `DELETE FROM users WHERE id = ?`,
              [userId],
              (_, result) => {
                  // Verifica se alguma linha foi afetada
                  if (result.rowsAffected > 0) {
                      resolve("Usuário excluído com sucesso!");
                      Alert.alert('Atenção:', 'Usuário excluído com sucesso!');
                  } else {
                      resolve("");
                  }
              },
              (tx, error) => {
                  console.error("Erro ao excluir usuário:", error);
                  reject(error); // Rejeita a promessa se ocorrer um erro
              }
          );
      });
  });
};  





