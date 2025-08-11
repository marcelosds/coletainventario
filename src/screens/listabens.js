import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBens } from '../database/baseSqlite';

// Helper: define quando considerar "inventariado"
const isInventariado = (status) => {
  const s = (status || '').toString().trim().toLowerCase();
  return s === 'bem inventariado!';
};

const Listabens = () => {
  const [bensRaw, setBensRaw] = useState([]);
  const [bensUI, setBensUI] = useState([]); // itens já mapeados p/ o render
  const [total, setTotal] = useState('0');
  const [inventariados, setInventariados] = useState('0');
  const [codigoInventario, setCodigoInventario] = useState('');
  const [stInventario, setStInventario] = useState(null); // não há fonte no baseSqlite.js; deixei para futuro
  const [loading, setLoading] = useState(true);
  const [isRefresh, setIsRefresh] = useState(false);
  const [error, setError] = useState(null);

  // Carrega dados básicos do AsyncStorage (apenas para mostrar o número do inventário)
  const loadHeaderInfo = useCallback(async () => {
    try {
      const json = await AsyncStorage.getItem('inventario');
      if (json) {
        const inv = JSON.parse(json);
        setCodigoInventario(inv?.codigoInventario ? String(inv.codigoInventario) : '');
        // Se você tiver stInventario salvo em algum lugar, dá pra ler aqui também.
      }
    } catch {
      // silencioso
    }
  }, []);

  const mapRowToUI = useCallback((row) => {
    // Mapeia colunas do BENS (baseSqlite.js) => campos usados no render
    return {
      nrPlaca: String(row?.placa ?? ''),
      cdItem: String(row?.codigo ?? ''),
      dsReduzida: String(row?.descricao ?? ''),
      dsLocalizacao: String(row?.localizacaoNome ?? ''),
      dsEstadoConser: String(row?.estadoConservacaoNome ?? ''),
      dsSituacao: String(row?.situacaoNome ?? ''),
      statusBem: String(row?.StatusBem ?? ''),
      _raw: row,
    };
  }, []);

  const fetchFromSQLite = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const rows = await getBens(); // retorna todas as colunas de BENS
      setBensRaw(Array.isArray(rows) ? rows : []);

      const mapeados = (Array.isArray(rows) ? rows : []).map(mapRowToUI);
      setBensUI(mapeados);

      setTotal(String(mapeados.length));

      // inventariados: tenta contar StatusBem (se existir na sua tabela)
      const qtdInventariados = (rows || []).filter(r => r?.StatusBem && String(r.StatusBem).trim() !== '').length;
      setInventariados(String(qtdInventariados));
    } catch (e) {
      setError('Erro ao carregar dados locais. Verifique a importação.');
    } finally {
      setLoading(false);
    }
  }, [mapRowToUI]);

  const onRefresh = useCallback(async () => {
    setIsRefresh(true);
    await fetchFromSQLite();
    setIsRefresh(false);
  }, [fetchFromSQLite]);

  useFocusEffect(
    useCallback(() => {
      loadHeaderInfo();
      fetchFromSQLite();
    }, [loadHeaderInfo, fetchFromSQLite])
  );

  // Ordena sem mutar estado original
  const dadosOrdenados = useMemo(() => {
    return [...bensUI].sort((a, b) => Number(a.cdItem || 0) - Number(b.cdItem || 0));
  }, [bensUI]);

  // Renderização da tela (mantido exatamente como você pediu)
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
      <Text style={styles.text}>Status: {item.statusBem?.trim() || ''}{isInventariado(item.statusBem) ? ' ✅' : ''}</Text>
    </View>
  );

  const keyExtractor = (item, idx) => {
    const base = item?.cdItem ? String(item.cdItem) : `idx-${idx}`;
    return item?.nrPlaca ? `${base}-${item.nrPlaca.trim()}` : base;
    };

  const inventarioEncerrado = stInventario === 1; // fica falso enquanto não tivermos a fonte desse status

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
          <Text style={[styles.title, { color: inventarioEncerrado ? 'red' : '#4682b4' }]}>
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
              <Text style={styles.hintText}>Nenhum bem encontrado. Importe os arquivos TXT e atualize.</Text>
            </View>
          ) : (
            <FlatList
              data={dadosOrdenados}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              refreshControl={<RefreshControl refreshing={isRefresh} onRefresh={onRefresh} colors={['#4682b4']} />}
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
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#484d50',
  },
  errorText: {
    color: '#b00020',
    textAlign: 'center',
    marginBottom: 6,
  },
  hintText: {
    color: '#6b7280',
    textAlign: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtext: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  title1: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#484d50',
  },
  title2: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#484d50',
  },
  itemContainer: {
    padding: 15,
    marginVertical: 5,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    color: '#4682b4',
  },
  lista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default Listabens;
