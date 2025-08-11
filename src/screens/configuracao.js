import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { limparTabelas } from '../database/baseSqlite'; // << importar função

const Configuracao = ({ navigation }) => {

  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('inventario');
      if (json) {
        setDados(JSON.parse(json));
      }
    };
    loadData();
  }, []);

  // Função para exportar o inventario.db
  const exportarBanco = async () => {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/inventario.db`;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);

      if (!fileInfo.exists) {
        Alert.alert("Erro", "Banco de dados não encontrado.");
        return;
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dbPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Exportar inventario.db',
        });
      } else {
        Alert.alert("Atenção", "O compartilhamento não está disponível neste dispositivo.");
      }

    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Falha ao exportar o banco de dados.");
    }
  };

  // Função para limpar as tabelas
  const limparBase = () => {
    Alert.alert(
      "Confirmação",
      "Deseja realmente apagar todos os dados das tabelas BENS, LOCAIS e SITUACAO?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: async () => {
            try {
              await limparTabelas();
              Alert.alert("Sucesso", "As tabelas foram limpas com sucesso.");
            } catch (err) {
              console.error(err);
              Alert.alert("Erro", "Falha ao limpar as tabelas.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}></Text>

      {/* Botão para importar arquivos */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#4682b4' }]}
        onPress={() => navigation.navigate('ImportarArquivos')}
      >
        <Text style={styles.buttonText}>📂 Importar Arquivos</Text>
      </TouchableOpacity>

      {/* Botão para exportar o banco de dados */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#32CD32' }]}
        onPress={exportarBanco}
      >
        <Text style={styles.buttonText}>💾 Exportar inventario.db</Text>
      </TouchableOpacity>

      {/* Botão para limpar base */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#b22222' }]}
        onPress={limparBase}
      >
        <Text style={styles.buttonText}>🗑 Limpar Base de Dados</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f0f0f0',
    padding: 20
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20
  },
  button: {
    padding: 15,
    borderRadius: 5,
    marginTop: 10
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center'
  }
});

export default Configuracao;
