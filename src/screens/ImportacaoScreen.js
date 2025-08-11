import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { importarArquivosTXT, importEvents } from '../database/baseSqlite';

const ImportacaoScreen = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    const sub = importEvents.addListener("progress", ({ total, current }) => {
      if (total > 0) {
        setStatusMsg(`Importando... ${current} / ${total} registros`);
      }
    });
    return () => sub.remove();
  }, []);

  const handleImport = async () => {
    setIsImporting(true);
    setStatusMsg('Iniciando importação...');
    try {
      await importarArquivosTXT();
      setStatusMsg('✅ Importação concluída com sucesso!');
    } catch (err) {
      console.error(err);
      setStatusMsg(`❌ Erro: ${err.message}`);
    }
    setIsImporting(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Importar Arquivos de Inventário</Text>

      {!isImporting && (
        <Button title="Selecionar e Importar Arquivos" onPress={handleImport} />
      )}

      {isImporting && (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#007bff" style={{ marginBottom: 10 }} />
          <Text style={styles.progressText}>{statusMsg}</Text>
        </View>
      )}

      {!isImporting && statusMsg !== '' && (
        <Text style={styles.finalMsg}>{statusMsg}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  progressContainer: {
    marginTop: 20,
    alignItems: 'center'
  },
  progressText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555'
  },
  finalMsg: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center'
  }
});

export default ImportacaoScreen;
