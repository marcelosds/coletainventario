import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, TextInput, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { limparTabelas, authenticateUser } from '../database/baseSqlite';

const Configuracao = ({ navigation }) => {
  const [dados, setDados] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      const json = await AsyncStorage.getItem('inventario');
      if (json) setDados(JSON.parse(json));

      // tenta pré-preencher e-mail do usuário, se você salvar em algum lugar
      const storedEmail = await AsyncStorage.getItem('userEmail');
      if (storedEmail) setEmail(storedEmail);
    };
    loadData();
  }, []);

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

  // 1) Abre o modal para revalidar o acesso
  const solicitarRevalidacao = () => {
    setAuthError('');
    setShowAuth(true);
  };

  // 2) Após credencial válida, pergunta se deseja apagar e executa
  const confirmarELimpar = () => {
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

  // 3) Valida credenciais no DB
  const autenticar = async () => {
    try {
      setAuthLoading(true);
      setAuthError('');
      const user = await authenticateUser(String(email || '').trim(), String(senha || '').trim());
      if (!user) {
        setAuthError('Credenciais inválidas. Verifique e-mail e senha.');
        return;
      }
      setShowAuth(false);
      setSenha('');
      confirmarELimpar();
    } catch (e) {
      console.error(e);
      setAuthError('Falha ao validar acesso.');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}></Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#4682b4' }]}
          onPress={() => navigation.navigate('ImportarArquivos')}
        >
          <Text style={styles.buttonText}>📂 Importar Arquivos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#32CD32' }]}
          onPress={exportarBanco}
        >
          <Text style={styles.buttonText}>💾 Exportar inventario.db</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FOOTER fixo */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={solicitarRevalidacao}
        >
          <Text style={styles.buttonText}>🗑 Limpar Base de Dados</Text>
        </TouchableOpacity>
      </View>

      {/* Modal de autenticação */}
      <Modal visible={showAuth} transparent animationType="fade" onRequestClose={() => setShowAuth(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirme seu acesso</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="E-mail"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={styles.modalInput}
              placeholder="Senha"
              secureTextEntry
              value={senha}
              onChangeText={setSenha}
            />
            {!!authError && <Text style={styles.modalError}>{authError}</Text>}

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#6b7280' }]} onPress={() => { setShowAuth(false); setSenha(''); }}>
                <Text style={styles.modalBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#4682b4' }, (authLoading || !email || !senha) && { opacity: 0.6 }]}
                disabled={authLoading || !email || !senha}
                onPress={autenticar}
              >
                {authLoading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalBtnText}>Confirmar acesso</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f0f0f0' },
  container: { padding: 20, paddingBottom: 0 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  button: { padding: 15, borderRadius: 5, marginTop: 10 },
  buttonDanger: { backgroundColor: '#b22222' },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  footer: { position: 'absolute', left: 20, right: 20, bottom: 20 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  modalInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 6, padding: 10, fontSize: 16, color: '#111827', marginTop: 10 },
  modalError: { color: '#b00020', marginTop: 8, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 6, minWidth: 140, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});

export default Configuracao;
