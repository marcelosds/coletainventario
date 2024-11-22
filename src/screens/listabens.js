import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItemsSQLite } from '../database/baseSqlite';
import { getSituacaoInven } from '../database/baseSqlite';
import { getTotalItensInven } from '../database/baseSqlite';
import { getInventariados } from '../database/baseSqlite';


const Listabens = () => {
  const [bens, setBens] = useState([]); // Estado para armazenar os bens
  const [total, setTotal] = useState('');
  const [inventariados, setInventariados] = useState('');
  const [stInventario, setStInventario] = useState(null); // Adicionado para armazenar stInventario
  const [loading, setLoading] = useState(true); // Estado para controle de carregamento
  const [error, setError] = useState(null); // Estado para erro

  const [apiLink, setApiLink] = useState('');
  const [senhaLink, setSenhaLink] = useState('');
  const [codigoInventario, setCodigoInventario] = useState('');


  // Carrega os dados da configuração para o AsyncStorage
  useFocusEffect(
    React.useCallback(() => {
        const loadData = async () => {

        const json = await AsyncStorage.getItem('inventario');
        const inventario = JSON.parse(json);

        if (inventario) {
            setApiLink(inventario.apiLink);
            setSenhaLink(inventario.senhaLink);
            setCodigoInventario(inventario.codigoInventario.toString());

        }    
    }
    loadData(); // Chama a função para carregar os dados
  
    }, [])); // Executa uma vez na montagem do componente


  
  // Função para buscar os bens
  useFocusEffect(
    React.useCallback(() => {
        const fetchBens = async () => {
          setLoading(true); // Define o carregamento como verdadeiro
          setError(null); // Reseta o erro antes da nova requisição
            try {

              const json = await AsyncStorage.getItem('inventario');
              const inventario = JSON.parse(json);

             
               // Verifica se está habilitado para carregar da API ou do SQLite
              if (inventario.isEnabled) {
                // Carrega os bens da tabela INVENTARIOITEM do SQLite
                const bensSQLite = await getItemsSQLite(); // função para obter itens do SQLite
                setBens(bensSQLite);
                  
                const situacaoInven = await getSituacaoInven(); // função para obter situação do inventário do SQLite
                setStInventario(situacaoInven);
                
                const totalItens = await getTotalItensInven(); // função para obter totais de bens do SQLite
                setTotal(totalItens.toString());
                
                const inventariados = await getInventariados(); // função para obter itens inventariados do SQLite
                setInventariados(inventariados.toString());


              } else if (apiLink && senhaLink && codigoInventario) {

                                  
                const token = await AsyncStorage.getItem('userToken');

                const response = await axios.get(`${apiLink}/bens/${codigoInventario}`, {
                    headers: { Authorization: token },
                  }); // Endpoint da API

                const totalResponse = await axios.get(`${apiLink}/total/${codigoInventario}`, {
                  headers: { Authorization: token },
                }); // Endpoint da API

                const inventariadosResponse = await axios.get(`${apiLink}/inventariados/${codigoInventario}`, {
                  headers: { Authorization: token },
                }); // Endpoint da API

                const InventarioResponse = await axios.get(`${apiLink}/inventario/${codigoInventario}`, {
                  headers: { Authorization: token },
                }); // Endpoint da API

            setBens(response.data); // Armazena os dados no estado
                

            setStInventario(InventarioResponse.data.stInventario); // Armazena os dados no estado
                      
            if (totalResponse.data && totalResponse.data.totalBens) {
              setTotal(totalResponse.data.totalBens.toString()); // Garantindo que seja uma string
            }
                       
            setInventariados(inventariadosResponse.data.totalInventariados.toString()); // Garantindo que seja uma string
            }
        
            } catch (error) {
            setError(error.message); // Armazena a mensagem de erro no estado
            } finally {
            setLoading(false); // Define o carregamento como concluído
            }
            
        };
    fetchBens(); // Chama a função para carregar os dados
    }, [apiLink, senhaLink, codigoInventario])); // Executa uma vez na montagem do componente

  
  // Renderização da tela
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
      <Text style={styles.text}>Valor: {item.vlAtual}</Text>
      <Text style={styles.text}>Status: {item.StatusBem}</Text>
    </View>
  );


  const sortedData = bens.sort((a, b) => Number(a.cdItem) - Number(b.cdItem)); //Ordena a lista em ordem crescente pelo código

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : error ? (
        <Text>Erro ao carregar dados: Verificar conexão com servidor, estiver trabalhando offline, verifique importação.</Text>
      ) : (
        <>
          <Text style={[styles.title, { color: stInventario === 1 ? 'red' : '#5f9ea0' }]}>
            Inventário: {codigoInventario}
          </Text>
          {stInventario === 1 && (  // Verifica se stInventario é 2 para exibir o texto
          <Text style={[styles.title, { color: stInventario === 1 ? 'red' : '#5f9ea0' }]}>Encerrado!</Text>
          )}

          <View style={styles.subtext}>
            <Text style={styles.title1}>Total de Bens: {total}</Text>
            <Text style={styles.title2}>Inventariados: {inventariados}</Text>
          </View>
          <FlatList 
            data={bens}
            renderItem={renderItem}
            keyExtractor={item => item.cdItem.toString()} // Certifique-se de que cdItem pode ser convertido para string
          />
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
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#5f9ea0'
  },
  title1: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: 'red'
  },
  subtext: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Espaço igual entre os itens
    width: '100%', // Ocupa toda a largura disponível
    paddingHorizontal: 10, // Padding lateral
    paddingBottom: 10
  },
  title1: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title2: {
    fontSize: 16,
    fontWeight: 'bold',
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
    color: '#5f9ea0',
  },
  lista: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  }
});

export default Listabens;
