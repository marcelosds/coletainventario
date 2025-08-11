import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { importarArquivosTXT, importEvents } from '../database/baseSqlite';

const ImportacaoScreen = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [logs, setLogs] = useState([]); // opcional: histórico

  useEffect(() => {
    const subProg = importEvents.addListener("progress", ({ total = 0, current = 0 }) => {
      if (total > 0) setStatusMsg(`Importando... ${current} / ${total} registros`);
      else setStatusMsg('Importando...');
    });

    const subLog = importEvents.addListener("log", ({ message }) => {
      // mostra o mesmo texto do console
      setStatusMsg(message);
      setLogs(prev => [...prev, message]); // se quiser manter histórico
    });

    return () => {
      subProg.remove();
      subLog.remove();
    };
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setStatusMsg('Iniciando importação...');
    setLogs([]);

    try {
      await importarArquivosTXT();
      // Se o base emitir "log" ao fim, a msg final virá por lá.
      // Caso não venha, mantemos a última statusMsg do progress/log.
    } catch (err) {
      console.error(err);
      setStatusMsg(`❌ Erro: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importar Arquivos de Inventário</Text>

      {!isImporting && (
        <Button title="📥 Selecionar e Importar Arquivos" onPress={handleImport} color="#4682b4" />
      )}

      {isImporting && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#007bff" style={{ marginBottom: 10 }} />
          <Text style={styles.progressText}>{statusMsg}</Text>
        </View>
      )}

      {!isImporting && statusMsg !== '' && (
        <>
          <Text style={styles.finalMsg}>{statusMsg}</Text>
          {/* opcional: histórico de logs */}
          {/* {logs.map((l, i) => (<Text key={i} style={styles.logLine}>{l}</Text>))} */}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  progressContainer: { marginTop: 20, alignItems: 'center' },
  progressText: { marginTop: 10, fontSize: 16, color: '#555' },
  finalMsg: { marginTop: 20, fontSize: 16, textAlign: 'center' },
  logLine: { fontSize: 13, color: '#6b7280', textAlign: 'center', marginTop: 4 },
});

export default ImportacaoScreen;
