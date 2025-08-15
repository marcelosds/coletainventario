import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBens, getBensByInventario } from '../database/baseSqlite';

// Helper: define quando considerar "inventariado"
const isInventariado = (status) => {
  const s = (status || '').toString().trim().toLowerCase();
  return s === 'bem inventariado!';
};

const Listabens = () => {
  const [bensUI, setBensUI] = useState([]);
  const [total, setTotal] = useState('0');
  const [inventariados, setInventariados] = useState('0');
  const [codigoInventario, setCodigoInventario] = useState('');
  const [stInventario, setStInventario] = useState(null); // reservado para futuro
  const [loading, setLoading] = useState(true);
  const [isRefresh, setIsRefresh] = useState(false);
  const [error, setError] = useState(null);

  const mapRowToUI = useCallback((row) => ({
    nrPlaca: String(row?.placa ?? ''),
    cdItem: String(row?.codigo ?? ''),
    dsReduzida: String(row?.descricao ?? ''),
    dsLocalizacao: String(row?.localizacaoNome ?? ''),
    dsEstadoConser: String(row?.estadoConservacaoNome ?? ''),
    dsSituacao: String(row?.situacaoNome ?? ''),
    statusBem: String(row?.StatusBem ?? ''),
    _raw: row,
  }), []);

  const fetchFromSQLite = useCallback(async (codigo) => {
    setError(null);
    setLoading(true);

    try {
      if (!codigo) {
        // sem inventário definido: limpa e mostra dica
        setBensUI([]);
        setTotal('0');
        setInventariados('0');
        setError('Defina o inventário nas Configurações.');
        return;
      }

      let rows = [];
      if (typeof getBensByInventario === 'function') {
        // caminho mais eficiente (SQL já filtrado)
        rows = await getBensByInventario(String(codigo).trim());
      } else {
        // fallback: busca tudo e filtra em memória
        const all = await getBens();
        rows = (all || []).filter(r =>
          String(r?.nrInventario ?? '').trim() === String(codigo).trim()
        );
      }

      const mapeados = (rows || []).map(mapRowToUI);
      setBensUI(mapeados);

      setTotal(String(mapeados.length));
      const qtdInvent = (rows || []).filter(r => isInventariado(r?.StatusBem)).length;
      setInventariados(String(qtdInvent));
    } catch (e) {
      console.error(e);
      setError('Erro ao carregar dados locais. Verifique a importação.');
    } finally {
      setLoading(false);
    }
  }, [mapRowToUI]);

  const loadAndFetch = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('inventario');
      let codigo = '';
      if (json) {
        const inv = JSON.parse(json);
        codigo = inv?.codigoInventario ? String(inv.codigoInventario) : '';
      }
      setCodigoInventario(codigo);
      await fetchFromSQLite(codigo);
    } catch {
      await fetchFromSQLite('');
    }
  }, [fetchFromSQLite]);

  const onRefresh = useCallback(async () => {
    setIsRefresh(true);
    await loadAndFetch();
    setIsRefresh(false);
  }, [loadAndFetch]);

  useFocusEffect(
    useCallback(() => {
      loadAndFetch();
    }, [loadAndFetch])
  );

  // Ordena sem mutar estado original
  const dadosOrdenados = useMemo(() => {
    return [...bensUI].sort((a, b) => Number(a.cdItem || 0) - Number(b.cdItem || 0));
  }, [bensUI]);

  const renderItem = ({ item }) => (
    <View style={styles.itemContainer}>
      <View style={styles.lista}>
        <Text style={styles.text}>Placa: {item.nrPlaca.trim()}</Text>
        <Text style={styles.text}>Código: {item.cdItem.toString()}</Text>
      </View>
      <Text style={styles.text}>Descrição: {item.dsReduzida}</Text>
      <Text style={styles.text}>Localização: {item.dsLocalizacao}</Text>
      <Text style={styles.text}>Estado de Conservação: {item.dsEstadoConser}</Text>
      <Text style={styles.text}>Situação: {item.dsSituacao}</Text>
      <Text style={styles.text}>
        Status: {item.statusBem?.trim() || ''}{isInventariado(item.statusBem) ? ' ✅' : ''}
      </Text>
    </View>
  );

  const keyExtractor = (item, idx) => {
    const base = item?.cdItem ? String(item.cdItem) : `idx-${idx}`;
    return item?.nrPlaca ? `${base}-${item.nrPlaca.trim()}` : base;
  };

  const inventarioEncerrado = stInventario === 1;

  return (
    <View style={styles.container}>
      {loading && !isRefresh ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#4682b4" />
          <Text style={styles.loadingText}>Carregando bens...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.hintText}>Puxe para baixo para tentar novamente.</Text>
        </View>
      ) : (
        <>
          <Text style={[styles.title, { color: inventarioEncerrado ? 'red' : '#111827' }]}>
            Inventário: {codigoInventario || '—'}
          </Text>

          {inventarioEncerrado && (
            <Text style={[styles.title, { color: 'red' }]}>Encerrado!</Text>
          )}

          <View style={styles.subtext}>
            <Text style={styles.title1}>Total de Bens: {total}</Text>
            <Text style={styles.title2}>Inventariados: {inventariados}</Text>
          </View>

          {dadosOrdenados.length === 0 ? (
            <View style={styles.center}>
              <Text style={styles.hintText}>
                Nenhum bem encontrado para o inventário selecionado.
              </Text>
            </View>
          ) : (
            <FlatList
              data={dadosOrdenados}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              refreshControl={
                <RefreshControl refreshing={isRefresh} onRefresh={onRefresh} colors={['#4682b4']} />
              }
              contentContainerStyle={{ paddingBottom: 12 }}
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              removeClippedSubviews
              windowSize={11}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 24 },
  loadingText: { marginTop: 8, color: '#484d50' },
  errorText: { color: '#b00020', textAlign: 'center', marginBottom: 6 },
  hintText: { color: '#6b7280', textAlign: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  subtext: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingHorizontal: 10, paddingBottom: 10 },
  title1: { fontSize: 16, fontWeight: 'bold', color: '#484d50' },
  title2: { fontSize: 16, fontWeight: 'bold', color: '#484d50' },
  itemContainer: { padding: 15, marginVertical: 5, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, backgroundColor: '#fff' },
  text: { fontSize: 16, color: '#4682b4' },
  lista: { flexDirection: 'row', justifyContent: 'space-between' },
  });

export default Listabens;
