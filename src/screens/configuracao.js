import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  Modal, TextInput, ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Picker } from '@react-native-picker/picker';

import {
  limparTabelas,
  authenticateUser,
  importarArquivosTXT,
  listarInventarios,
  getBens,            // <- fallback
  getBensByInventario, // <- se existir, usamos; senão filtramos getBens()
  excluirInventario    // <- NOVO: função no baseSqlite.js para excluir inventário
} from '../database/baseSqlite';

const Configuracao = ({ navigation }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // nº usado APENAS para importar (gravar na base)
  const [nrInventario, setNrInventario] = useState('');

  const [isImporting, setIsImporting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  // combobox de inventários e seleção p/ demais telas / export
  const [inventarios, setInventarios] = useState([]);
  const [inventarioSelecionado, setInventarioSelecionado] = useState('');

  const [refreshing, setRefreshing] = useState(false);

  // ✅ checkbox que habilita ações sensíveis (backup, restaura, limpar)
  const [habilitarAcoes, setHabilitarAcoes] = useState(false);

  // ✅ checkbox que habilita a exclusão do inventário selecionado
  const [habilitarExcluir, setHabilitarExcluir] = useState(false);

  useEffect(() => {
    (async () => {
      const storedEmail = await AsyncStorage.getItem('userEmail');
      if (storedEmail) setEmail(storedEmail);
    })();
  }, []);

  const carregarInventarios = useCallback(async () => {
    try {
      const lista = await listarInventarios();
      const arr = (lista || []).map(String);
      setInventarios(arr);
      setInventarioSelecionado(prev => (prev && arr.includes(prev)) ? prev : (arr[0] || ''));
    } catch (e) {
      console.error(e);
      Alert.alert('❌ Erro!', 'Falha ao carregar inventários.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregarInventarios();
    }, [carregarInventarios])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await carregarInventarios();
    setRefreshing(false);
  }, [carregarInventarios]);

  // ===== Exportar/Restaurar DB =====
  const exportarBanco = async () => {
    try {
      const dbPath = `${FileSystem.documentDirectory}SQLite/inventario.db`;
      const fileInfo = await FileSystem.getInfoAsync(dbPath);
      if (!fileInfo.exists) {
        Alert.alert('❌ Erro!', 'Banco de dados não encontrado.');
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(dbPath, {
          mimeType: 'application/octet-stream',
          dialogTitle: 'Exportar inventario.db',
        });
      } else {
        Alert.alert('⚠️ Atenção!', 'O compartilhamento não está disponível neste dispositivo.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Erro!', 'Falha ao exportar o banco de dados.');
    }
  };

  const restaurarBanco = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/octet-stream', 'application/x-sqlite3', 'application/vnd.sqlite3', '*/*'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const file = res.assets?.[0] ?? res;
      const srcUri = file?.uri;
      const srcName = file?.name || 'arquivo selecionado';
      if (!srcUri) return Alert.alert('❌ Erro!', 'Arquivo inválido.');

      Alert.alert(
        'Restaurar banco de dados',
        `Substituir o inventario.db pelo arquivo: ${srcName}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Restaurar',
            style: 'destructive',
            onPress: async () => {
              try {
                const sqliteDir = `${FileSystem.documentDirectory}SQLite`;
                const destUri = `${sqliteDir}/inventario.db`;
                await FileSystem.makeDirectoryAsync(sqliteDir, { intermediates: true });
                const curInfo = await FileSystem.getInfoAsync(destUri);
                if (curInfo.exists) {
                  const ts = new Date().toISOString().replace(/[:.]/g, '-');
                  await FileSystem.copyAsync({ from: destUri, to: `${sqliteDir}/inventario.backup-${ts}.db` });
                }
                await FileSystem.deleteAsync(destUri, { idempotent: true });
                await FileSystem.copyAsync({ from: srcUri, to: destUri });
                Alert.alert('✅ Sucesso!', 'Base restaurada. Reabra o app para recarregar o banco.');
              } catch (e) {
                console.error(e);
                Alert.alert('❌ Erro!', 'Falha ao restaurar o banco de dados.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Erro!', 'Falha ao iniciar restauração.');
    }
  };

  // ===== IMPORTAÇÃO: usa APENAS o número digitado para gravar na base =====
  const handleImport = async () => {
    const nr = String(nrInventario || '').trim();
    if (!nr) {
      Alert.alert('⚠️ Atenção!', 'Informe o número do inventário.');
      return;
    }
    setIsImporting(true);
    setStatusMsg('Iniciando importação...');

    try {
      await importarArquivosTXT(nr); // grava na base usando o nº informado
      setStatusMsg(`✅ Importação concluída para o inventário ${nr}.`);
      await carregarInventarios();   // atualiza a lista do combo
    } catch (err) {
      console.error(err);
      setStatusMsg(`❌ Erro: ${err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // ===== EXPORTAÇÃO: gera Resultado.TXT do inventário DIGITADO na caixa de texto =====
  const exportarResultadoTXT = async () => {
    try {
      const nr = String(nrInventario || '').trim();
      if (!nr) {
        Alert.alert('⚠️ Atenção!', 'Informe o número do inventário na caixa de texto para exportar.');
        return;
      }

      // Busca bens do inventário digitado
      let rows = [];
      if (typeof getBensByInventario === 'function') {
        rows = await getBensByInventario(nr);
      } else {
        const all = await getBens();
        rows = (all || []).filter(r => String(r?.nrInventario ?? '').trim() === nr);
      }

      if (!rows || rows.length === 0) {
        Alert.alert('⚠️ Atenção!', `Nenhum bem encontrado para o inventário ${nr}.`);
        return;
      }

      // Helpers p/ formatação fixa
      const s = v => (v == null ? '' : String(v));
      // placa: preencher com zeros à esquerda até 12 posições (NÃO remove letras)
      const padLeftZerosAny = (val, len) => {
        const t = s(val).slice(-len);
        return t.padStart(len, '0');
      };
      const padLeftZeros = (val, len) => {
        const t = s(val).replace(/\D+/g, '').slice(-len);
        return (''.padStart(len, '0') + t).slice(-len);
      };

      // Monta o conteúdo
      const linhas = rows.map(r => {
        const placa   = padLeftZerosAny(r?.placa, 12);
        const codLoc  = padLeftZeros(r?.localAntigo, 3);
        const codEst  = padLeftZeros(r?.codigoEstado, 2);
        const codSit  = padLeftZeros(r?.codigoSituacao ?? r?.codigo_situacao, 2);
        const codLoc2 = padLeftZeros(r?.codigoLocalizacao, 3);
        return placa + codLoc + codEst + codSit + codLoc2;
      });

      const conteudo = linhas.join('\n') + '\n';

      // Grava arquivo e compartilha
      const outUri = `${FileSystem.documentDirectory}Resultado.TXT`;
      await FileSystem.writeAsStringAsync(outUri, conteudo, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outUri, {
          mimeType: 'text/plain',
          dialogTitle: `Exportar Resultado.TXT (Inv. ${nr})`,
        });
      } else {
        Alert.alert('✅ Sucesso!', `Arquivo gerado em:\n${outUri}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('❌ Erro!', 'Falha ao gerar o arquivo Resultado.TXT.');
    }
  };

  // ===== Define qual inventário será usado pelas demais telas =====
  const usarInventarioNasTelas = async () => {
    const nr = String(inventarioSelecionado || '').trim();
    if (!nr) {
      Alert.alert('⚠️ Atenção!', 'Selecione um inventário.');
      return;
    }
    await AsyncStorage.setItem('inventario', JSON.stringify({ codigoInventario: nr }));
    Alert.alert('✅ Sucesso!', `Inventário ${nr} definido para trabalho.`);
  };

  // ===== Exclusão do inventário selecionado (com checkbox) =====
  const excluirInventarioSelecionado = async () => {
    const nr = String(inventarioSelecionado || '').trim();
    if (!nr) {
      Alert.alert('⚠️ Atenção!', 'Selecione um inventário para excluir.');
      return;
    }

    Alert.alert(
      'Excluir Inventário',
      `Deseja realmente excluir o inventário ${nr}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await excluirInventario(nr);
              // Opcional: checar contagem de linhas removidas (se a função retornar)
              if (result?.bensRemovidos >= 0) {
                Alert.alert('✅ Sucesso!', `Inventário ${nr} excluído. Registros removidos: ${result.bensRemovidos}.`);
              } else {
                Alert.alert('✅ Sucesso!', `Inventário ${nr} excluído.`);
              }
              setHabilitarExcluir(false);
              await carregarInventarios();
              // Se o inventário ativo nas telas era o mesmo, limpamos a seleção salva
              const ativoJson = await AsyncStorage.getItem('inventario');
              if (ativoJson) {
                const ativo = JSON.parse(ativoJson);
                if (String(ativo?.codigoInventario || '') === nr) {
                  await AsyncStorage.removeItem('inventario');
                }
              }
            } catch (e) {
              console.error(e);
              Alert.alert('❌ Erro!', 'Falha ao excluir inventário.');
            }
          }
        }
      ]
    );
  };

  // ===== Limpeza com autenticação =====
  const solicitarRevalidacao = () => {
    setAuthError('');
    setShowAuth(true);
  };

  const confirmarELimpar = () => {
    Alert.alert(
      '❓ Confirmação:',
      'Deseja realmente apagar todos os dados das tabelas BENS, LOCAIS e SITUACAO?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              await limparTabelas();
              await carregarInventarios();
              Alert.alert('✅ Sucesso!', 'As tabelas foram limpas com sucesso.');
            } catch (err) {
              console.error(err);
              Alert.alert('❌ Erro!', 'Falha ao limpar as tabelas.');
            }
          }
        }
      ]
    );
  };

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

  // ✅ Componente de Checkbox simples (sem libs externas)
  const CheckBox = ({ value, onChange, label }) => (
    <TouchableOpacity
      style={styles.chkRow}
      onPress={() => onChange(!value)}
      activeOpacity={0.8}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
    >
      <View style={[styles.checkbox, value && styles.checkboxChecked]}>
        {value ? <Text style={styles.checkboxMark}>✓</Text> : null}
      </View>
      <Text style={styles.chkLabel}>{label}</Text>
    </TouchableOpacity>
  );

  // Helper para aplicar opacidade quando desabilitado
  const disabledStyle = (disabled) => (disabled ? { opacity: 0.5 } : null);

  return (
    <View style={styles.root}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 200 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.container}>
          {/* Importação: nrInventario NÃO vai para outras telas */}
          <Text style={styles.sectionTitle}>Importação e Exportação</Text>
          <View style={styles.backupContainer}>
            <Text style={styles.labelNumero}>Informe número do inventário:</Text>
            <TextInput
              style={styles.inputNumero}
              placeholder="Ex.: 100"
              value={nrInventario}
              onChangeText={setNrInventario}
              keyboardType="number-pad"
              autoCapitalize="none"
              textAlign="center"
            />
          </View>

          <View style={styles.backupContainer}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#029DAF' }, disabledStyle(!String(nrInventario || '').trim())]}
            onPress={handleImport}
            disabled={!String(nrInventario || '').trim()}
          >
            <Text style={styles.buttonText}>
              {isImporting ? 'Importando...' : '📥 Importar Arquivos'}
            </Text>
          </TouchableOpacity>

          {/* Exportação Resultado.TXT do inventário digitado */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#029DAF' }, disabledStyle(!String(nrInventario || '').trim())]}
            onPress={exportarResultadoTXT}
            disabled={!String(nrInventario || '').trim()}
          >
            <Text style={styles.buttonText}>📤 Exportar Arquivos</Text>
          </TouchableOpacity>
          </View>

          {!!statusMsg && <Text style={styles.statusMsg}>{statusMsg}</Text>}

          {/* Seleção do inventário para uso nas demais telas */}
          <View style={styles.divider} />
          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Inventário de Trabalho Atual</Text>

          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Selecione o inventário:</Text>
            <View style={styles.pickerBox}>
              <Picker
                selectedValue={inventarioSelecionado}
                onValueChange={setInventarioSelecionado}
                dropdownIconColor="#374151"
              >
                {inventarios.length === 0 ? (
                  <Picker.Item label="(nenhum inventário encontrado)" value="" />
                ) : (
                  inventarios.map(v => <Picker.Item key={v} label={v} value={v} />)
                )}
              </Picker>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#029DAF' }]}
            onPress={usarInventarioNasTelas}
          >
            <Text style={styles.buttonText}>✅ Confirma</Text>
          </TouchableOpacity>

          {/* ✅ Novo checkbox e botão de excluir (fica abaixo do Confirmar) */}
          <CheckBox
            value={habilitarExcluir}
            onChange={setHabilitarExcluir}
            label="Deseja excluir este inventário?"
          />

          <TouchableOpacity
            style={[styles.button, styles.buttonDanger, disabledStyle(!habilitarExcluir)]}
            onPress={habilitarExcluir ? excluirInventarioSelecionado : () => {}}
            disabled={!habilitarExcluir}
          >
            <Text style={styles.buttonText}>🗑 Excluir Inventário</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FOOTER fixo */}
      <View style={styles.footer}>
        {/* Linha preta acima do título */}
        <View style={styles.divider} />
        {/* ✅ Checkbox que habilita as ações de segurança (backup, restaura, limpar) */}
        <CheckBox
          value={habilitarAcoes}
          onChange={setHabilitarAcoes}
          label="Parâmetros de Segurança"
        />

        <View style={styles.backupContainer}>
          <TouchableOpacity
            style={[styles.buttonBackup, { backgroundColor: '#029DAF' }, disabledStyle(!habilitarAcoes)]}
            onPress={exportarBanco}
            disabled={!habilitarAcoes}
          >
            <Text style={styles.buttonText}>💾 Backup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonBackup, { backgroundColor: '#029DAF' }, disabledStyle(!habilitarAcoes)]}
            onPress={restaurarBanco}
            disabled={!habilitarAcoes}
          >
            <Text style={styles.buttonText}>🔄 Restaura</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger, disabledStyle(!habilitarAcoes)]}
          onPress={habilitarAcoes ? solicitarRevalidacao : () => {}}
          disabled={!habilitarAcoes}
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
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#6b7280' }]}
                onPress={() => { setShowAuth(false); setSenha(''); }}
              >
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
  container: { padding: 20, paddingBottom: 180 },
  sectionTitle: { fontSize: 18, textAlign: "center", fontWeight: '700', color: '#111827', marginBottom: 8 },
  labelNumero: { marginTop: 6, marginBottom: 6, color: '#374151', fontWeight: '600' },
  inputNumero: {
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10, fontSize: 16, color: '#111827',
    marginBottom: 10
  },
  statusMsg: { marginTop: 8, color: '#374151' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 50 // espaço entre label e picker
  },
  pickerLabel: {
    color: '#374151',
    fontWeight: '600',
    minWidth: 140, // largura mínima para alinhar bem
  },
  pickerBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    textAlign:'right'
  },

  button: { padding: 15, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  buttonBackup: { flex: 1, marginHorizontal: 4, borderRadius: 8, padding: 15, alignItems: 'center' },
  buttonDanger: { backgroundColor: '#ff6961' },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },

  footer: { position: 'absolute', left: 20, right: 20, bottom: 20 },
  backupContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: {
    borderBottomColor: '#000', // preto
    borderBottomWidth: 1,      // espessura
    marginTop: 10,
  },

  // ✅ Checkbox styles
  chkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 4,
    borderWidth: 2, borderColor: '#029DAF',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', marginRight: 10
  },
  checkboxChecked: {
    backgroundColor: '#029DAF',
  },
  checkboxMark: { color: '#fff', fontSize: 16, lineHeight: 16, fontWeight: 'bold' },
  chkLabel: { color: '#374151', flex: 1 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modalCard: { width: '100%', backgroundColor: '#fff', borderRadius: 10, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  modalInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 6,
    padding: 10, fontSize: 16, color: '#111827',
    marginTop: 10
  },
  modalError: { color: '#b00020', marginTop: 8, textAlign: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 14, gap: 10 },
  modalBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 6, minWidth: 140, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '600' },
});

export default Configuracao;
