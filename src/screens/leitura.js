import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import { CameraView, Camera } from "expo-camera";
import RNPickerSelect from 'react-native-picker-select';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getLocais } from '../database/baseSqlite';
import { getSituacao } from '../database/baseSqlite';
import { getEstados } from '../database/baseSqlite';
import { getItemsFromSQLite } from '../database/baseSqlite';
import { atualizarInventario } from '../database/baseSqlite';
import { getLocalizaSQLite } from '../database/baseSqlite';
import { getSituacaoInven } from '../database/baseSqlite';


const Leitura = () => {
  const [texto, setTexto] = useState("Aguardando leitura..."); // Estado para armazenar o texto
  const [corTexto, setCorTexto] = useState("#008000"); // Estado para armazenar a cor do texto
  const [bensData, setBensData] = useState([]); // Armazena os dados dos bens
  const [isBtnLimparDisabled, setBtnLimparDisabled] = useState(false); // Estado para controlar se o botão está desativado
  const [isBtnGravarDisabled, setBtnGravarDisabled] = useState(true); // Estado para controlar se o botão está desativado
  const [isEditable, setIsEditable] = useState(true); // Estado que controla se o TextInput é editável
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [situacoes, setSituacoes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [stInventario, setStInventario] = useState(null); // Adicionado para armazenar stInventario
  const [selectedLocalizacao, setSelectedLocalizacao] = useState(null); // Armazena o ID da localização
  const [selectedEstado, setSelectedEstado] = useState(null); // Armazena o ID da localização
  const [selectedSituacao, setSelectedSituacao] = useState(null); // Armazena o ID da localização
  const [selectObservacao, setObservacao] = useState(''); // Armazena o ID da localização
  const [fields, setFields] = useState({
    placa: '',
    codigo: '',
    descricao: '',
    status: '',
    valor: '',
    Observacao: '',
  });

  // Limpa as combobox
  const limparCampo = () => {
    setSelectedLocalizacao(null); 
    setSelectedEstado(null);
    setSelectedSituacao(null);
    setObservacao('');
    
  };

  // Deixa a edição do campo placa desabilitado após encontrar bem
  const destivaEditable = () => {
    setIsEditable(!isEditable); // Alterna a editabilidade
  };

  const ativaEditable = () => {
    setIsEditable(true);
  }

  const handleLeituraRealizada = () => {
    setTexto("Leitura realizada!"); // Atualiza o texto
    setCorTexto("red"); // Define a cor do texto para vermelho
  };

  const handleAguardandoLeitura = () => {
    setTexto("Aguardando leitura..."); // Reseta para o texto original
    setCorTexto("green"); // Define a cor do texto para verde
  };

  const [codigoUnidadeGestora, setCodigoUnidadeGestora] = useState('');
  const [apiLink, setApiLink] = useState('');
  const [senhaLink, setSenhaLink] = useState('');
  const [codigoInventario, setCodigoInventario] = useState('');

  // Carrega os dados da configuração para o AsyncStorage
  useFocusEffect(
    React.useCallback(() => {
    const loadData = async () => {
      try {
        const json = await AsyncStorage.getItem('inventario');
        const inventario = JSON.parse(json);

        if (inventario) {
          setApiLink(inventario.apiLink);
          setSenhaLink(inventario.senhaLink);
          setCodigoInventario(inventario.codigoInventario.toString());
          setCodigoUnidadeGestora(inventario.codigoUnidadeGestora.toString());

          // Lógica para exibir o texto adequado com base no código da unidade gestora
          const unidadeGestora = inventario.codigoUnidadeGestora.toString() === '1'
          ? 'Câmara Municipal'
          : inventario.codigoUnidadeGestora.toString() === '0'
          ? 'Prefeitura Municipal'
          : 'Demais Unidades'; // Para outros casos

          Alert.alert(
            'Informações do Inventário',
            `Inventário: ${inventario.codigoInventario.toString()}
Unidade Gestora: ${inventario.codigoUnidadeGestora.toString()} - ${unidadeGestora}`
          );
        }
      } catch (error) {
        Alert.alert('Erro', 'Localizações e Situações não foram carregadas!');
      }
    };

    loadData(); // Chama a função para carregar os dados
    }, [])); // Executa uma vez na montagem do componente



  // Carrega as localizações da base de dados informada nas configurações    
  useEffect(() => {
    const carregaLocais = async () => {
    try {
          const json = await AsyncStorage.getItem('inventario');
          const inventario = JSON.parse(json);

         // Verifica se está habilitado para carregar da API ou do SQLite
         if (inventario.isEnabled) {

          // Carrega os bens da tabela INVENTARIOITEM do SQLite
          const locais = await getLocais(); // função para obter itens do SQLite

          // Supondo que a resposta é um array de objetos com `label` e `value`
          const locaisFormatados = locais.map(item => ({
            label: item.dsLocalizacao,
            value: item.cdLocalReduzido,
        }));
          
          setLocalizacoes(locaisFormatados);
          
          } else if (apiLink && senhaLink && codigoUnidadeGestora) {

          const token = await AsyncStorage.getItem('userToken');
       
          const response = await axios.get(`${apiLink}/locais/${codigoUnidadeGestora}`, {
            headers: { Authorization: token },
          });
          
          // Supondo que a resposta é um array de objetos com `label` e `value`
          const formattedData = response.data.map((item) => ({
            label: item.dsLocalizacao, // ajuste conforme o formato do seu objeto
            value: item.cdLocalReduzido,
          }));
          setLocalizacoes(formattedData);
        }
  

    } catch (error) {
      //console.error("Erro na requisição da API:", error);
      //Alert.alert('Erro', 'Erro de comunicação com a API, serviço pode estar inativo!')
    }
  };
    carregaLocais();
  }, [apiLink, senhaLink, codigoUnidadeGestora]);

  // Carrega as situações da base de dados informada nas configurações 
  useEffect(() => {
    const carregaSituacao = async () => {
    try {

      const json = await AsyncStorage.getItem('inventario');
      const inventario = JSON.parse(json);

      // Verifica se está habilitado para carregar da API ou do SQLite
      if (inventario.isEnabled) {

        // Carrega os bens da tabela INVENTARIOITEM do SQLite
        const situacao = await getSituacao(); // função para obter itens do SQLite

        // Supondo que a resposta é um array de objetos com `label` e `value`
        const situacaoFormatadas = situacao.map(item => ({
          label: item.dsSituacao,
          value: item.cdSituacaoReduzido,
      }));
        
        setSituacoes(situacaoFormatadas);
        
        } else if (apiLink) {

      const token = await AsyncStorage.getItem('userToken');    

      const response = await axios.get(`${apiLink}/situacao`, {
        headers: { Authorization: token },
      });
      // Supondo que a resposta é um array de objetos com `label` e `value`
      const formattedData = response.data.map((item) => ({
        label: item.dsSituacao, // ajuste conforme o formato do seu objeto
        value: item.cdSituacaoReduzido,
      }));
      setSituacoes(formattedData);
    }

    } catch (error) {
      //console.error("Erro na requisição da API:", error);
    }

    };
    carregaSituacao();
  }, [apiLink]);


  // Carrega as estados de conservação da base de dados informada nas configurações 
  useEffect(() => {
    const carregaEstados = async () => {
    try {

      const json = await AsyncStorage.getItem('inventario');
      const inventario = JSON.parse(json);

      // Verifica se está habilitado para carregar da API ou do SQLite
      if (inventario.isEnabled) {

        // Carrega os bens da tabela INVENTARIOITEM do SQLite
        const estados = await getEstados(); // função para obter itens do SQLite

        // Supondo que a resposta é um array de objetos com `label` e `value`
        const estadosFormatados = estados.map(item => ({
          label: item.dsEstadoConser,
          value: item.cdEstadoConser,
      }));
        
        setEstados(estadosFormatados);
        
        } else if (apiLink) {

      const token = await AsyncStorage.getItem('userToken');

      const response = await axios.get(`${apiLink}/estado`, {
        headers: { Authorization: token },
      });
      // Supondo que a resposta é um array de objetos com `label` e `value`
      const formattedData = response.data.map((item) => ({
        label: item.dsEstadoConser, // ajuste conforme o formato do seu objeto
        value: item.cdEstadoConser,
      }));
      setEstados(formattedData);
    }

    } catch (error) {
      //console.error("Erro na requisição da API:", error);
    }

    };
    carregaEstados();
  }, [apiLink]);


  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setLoading(true);
    fetchBemData(data.trim());
    handleLeituraRealizada();
  };


  const fetchBemData = async (placa) => {
    try {

      //const placaInput = fields.placa.trim() ? fields.placa.trim() : fields.codigo;

      const json = await AsyncStorage.getItem('inventario');
      const inventario = JSON.parse(json);

       // Verifica se está habilitado para carregar da API ou do SQLite
       if (inventario.isEnabled) {
        // Carrega os bens da tabela INVENTARIOITEM do SQLite
        const bem = await getLocalizaSQLite(placa); // função para obter itens do SQLite
        setFields({
          placa: bem.nrPlaca.trim() || '', // Guardar como string ou vazio
          codigo: bem.cdItem.toString() || '',
          descricao: bem.dsReduzida || '',
          status: bem.StatusBem || '',
          valor: bem.vlAtual || '',
          Observacao: bem.dsObservacao || '',
        });
  
        setSelectedEstado(bem.cdEstadoConserReal);
        setSelectedLocalizacao(bem.cdLocalizacaoReal);
        setSelectedSituacao(bem.cdSituacaoAtual);
        setObservacao(bem.dsObservacao);

      } else if (apiLink && senhaLink && codigoInventario) {

      const token = await AsyncStorage.getItem('userToken');
      
      const response = await axios.get(`${apiLink}/bens/${placa}/${codigoInventario}`, {
        headers: { Authorization: token },
      });
      const bem = response.data; // A resposta já vem em JSON, então direto 'data'.
      setFields({
        placa: bem.nrPlaca.trim() || '', // Guardar como string ou vazio
        codigo: bem.cdItem.toString() || '',
        descricao: bem.dsReduzida || '',
        status: bem.StatusBem || '',
        valor: bem.vlAtual || '',
        Observacao: bem.dsObservacao || '',
      });

      setSelectedEstado(bem.cdEstadoConserReal);
      setSelectedLocalizacao(bem.cdLocalizacaoReal);
      setSelectedSituacao(bem.cdSituacaoAtual);
      setObservacao(bem.dsObservacao);
      
    }
    } catch (error) {
      Alert.alert('Atenção:', 'Bem não localizado nesse inventário!');
    } finally {
      setLoading(false);
      setBtnGravarDisabled(false);
      destivaEditable();
    }
    
  };

  // Função para capturar todos os bens
  useEffect(() => {
  const fetchBensData = async () => {
    try {

      const json = await AsyncStorage.getItem('inventario');
      const inventario = JSON.parse(json);

      // Verifica se está habilitado para carregar da API ou do SQLite
      if (inventario.isEnabled) {
        // Carrega os bens da tabela INVENTARIOITEM do SQLite
        const bensFromSQLite = await getItemsFromSQLite(); // função para obter itens do SQLite
        setBensData(bensFromSQLite);
        
      } else if (apiLink && senhaLink && codigoInventario) {

      const token = await AsyncStorage.getItem('userToken');

      const response = await axios.get(`${apiLink}/bens/${codigoInventario}`, {
        headers: { Authorization: token },
      });
      setBensData(response.data); // Armazena os dados dos bens
    }
    } catch (error) {
      //Alert.alert('Erro', 'Não foi possível obter os dados dos bens.');
    }
  };
  fetchBensData();
  }, [apiLink, senhaLink, codigoInventario]);


  // Função para localizar a placa ou código informado(a) na caixa de texto
  const handleLocalizar = () => {

    const placaInput = fields.placa.trim(); // Captura o texto do TextInput e remove espaços em branco
 
    // Verifica se a entrada está vazia
    if (!placaInput) {
      Alert.alert('Atenção', 'Por favor, insira uma Placa ou Código!'); // Alerta se o campo estiver vazio
      return; // Sai da função
    }

    const bemEncontrado = bensData.find(bem => (bem.nrPlaca.trim() === placaInput || bem.cdItem.toString() === placaInput));

    if (bemEncontrado) {
      fetchBemData(bemEncontrado.cdItem || bemEncontrado.nrPlaca); // Chama a função com a placa do bem encontrado
      handleLeituraRealizada();
      setBtnLimparDisabled(true); // Desativa o botão após a ação
      setBtnGravarDisabled(false); // Ativa o botão após a ação
      destivaEditable();
    } else {
      Alert.alert('Atenção:', 'Bem não localizado nesse inventário!'); // Alerta se não encontrar
    }
  };

  
  const handleInputChange = (field, value) => {
    setFields({
      ...fields,
      [field]: value,
    });
  };

  // Função para buscar situação do inventário
  useFocusEffect(
    React.useCallback(() => {
        const carrega = async () => {
            try {

              const json = await AsyncStorage.getItem('inventario');
              const inventario = JSON.parse(json);

              if (inventario.isEnabled) {
                const situacaoInven = await getSituacaoInven(); // função para obter situação do inventário do SQLite
                setStInventario(situacaoInven);

              } else if (apiLink && senhaLink && codigoInventario) {

                const token = await AsyncStorage.getItem('userToken');

                const InventarioResponse = await axios.get(`${apiLink}/inventario/${codigoInventario}`, {
                  headers: { Authorization: token },
                }); // Endpoint da API

            setStInventario(InventarioResponse.data.stInventario); // Armazena os dados no estado

                }
            } catch (error) {
            
            } finally {

            }
            
        };
    carrega(); // Chama a função para carregar os dados
    }, [apiLink, senhaLink, codigoInventario])); // Executa uma vez na montagem do componente


  const salvar = async () => {

        // Verifica se stInventario é diferente de 1
        if (stInventario !== 1) {
            saveData();
          } else {
            Alert.alert('Atenção:', 'Este inventário encontra-se encerrado!')
          }
    };
  
  // Função para gravar as alterações dos ben
  const saveData = async () => { 
    try {

      const placaInput = fields.placa.trim() ? fields.placa.trim() : fields.codigo;

      const json = await AsyncStorage.getItem('inventario');
      const inventario = JSON.parse(json);
      const invent = inventario.codigoInventario;

      const dados = {
        cdLocalizacaoReal: selectedLocalizacao, // Passa o ID da localização
        cdEstadoConserReal: selectedEstado, // Passa o ID da estado
        cdSituacaoAtual: selectedSituacao, // Passa o ID da situação
        dsObservacao: selectObservacao
      };


      if (inventario.isEnabled) {
        await atualizarInventario(selectedLocalizacao, selectedEstado, selectedSituacao, selectObservacao, placaInput, invent);
        Alert.alert('Sucesso', 'Dados do bem salvos com sucesso.');
          
        // Limpar os campos após salvar
        setFields({
          placa: '',
          codigo: '',
          descricao: '',
          localizacao: '',
          estado: '',
          situacao: '',
          status: '',
          valor: '',
          Observacao: '',
        });
        setScanned(false);
        handleAguardandoLeitura();
        setBtnGravarDisabled(true); // Desabilita o botão gravar
        limparCampo();
        ativaEditable();

      } else if (apiLink && senhaLink && codigoInventario) {

        const token = await AsyncStorage.getItem('userToken');

        await axios.put(`${apiLink}/bens/${placaInput}/${codigoInventario}`, dados, {
          headers: { Authorization: token },
        });


        Alert.alert('Sucesso', 'Dados do bem salvos com sucesso.');
          
        // Limpar os campos após salvar
        setFields({
          placa: '',
          codigo: '',
          descricao: '',
          localizacao: '',
          estado: '',
          situacao: '',
          status: '',
          valor: '',
          Observacao: '',
        });
        setScanned(false);
        handleAguardandoLeitura();
        setBtnGravarDisabled(true); // Desabilita o botão gravar
        limparCampo();
        ativaEditable();
        
      
    }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar os dados do bem.');
    }
  };

  if (hasPermission === null) {
    return <Text>Câmera requer permissão!</Text>;
  }

  if (hasPermission === false) {
    return <Text>Sem acesso a câmera!</Text>;
  }


  
  return (
    <View style={styles.container}>
      
      <View style={styles.scannerContainer}>
        <CameraView 
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417", 'aztec', 'ean13', 'ean8', 'upc_e', 'datamatrix', 'code39', 'code93', 'itf14',
                          'codabar', 'code128', 'upc_a']
          }}
        />

         {/* Linha Vermelha Centralizada */}
          <View style={styles.redLine} />
            
          <Text style={[styles.text1, { color: corTexto }]}>{texto}</Text> 
      </View>

      <TextInput
          style={styles.inputStatus}
          placeholder=""
          value={fields.status}
          onChangeText={(value) => handleInputChange('status', value)}
          editable={false} 
        />
      
      <ScrollView style={styles.formContainer}>
        <View style={styles.busca} >
          <TextInput
            style={styles.input}
            placeholder=" Digite a Placa ou Código"
            value={fields.placa}
            onChangeText={(value) => handleInputChange('placa', value)}
            editable={isEditable} // Define se o TextInput é editável
          />
          <TextInput
            style={styles.input}
            placeholder=" Código"
            value={fields.codigo}
            onChangeText={(value) => handleInputChange('codigo', value)}
            editable={false} // Define se o TextInput é editável
          />
        </View>
      
        <TextInput
          style={styles.inputDescricao}
          multiline={true} // Permite múltiplas linhas
          numberOfLines={2} // Número de linhas visíveis
          placeholder=" Descrição"
          value={fields.descricao}
          onChangeText={(value) => handleInputChange('descricao', value)}
          editable={false}
        />
        <RNPickerSelect
          style={pickerSelectStyles}
          placeholder={{
            label: 'Localização',
            value: null,
          }}
          onValueChange={(value) => setSelectedLocalizacao(value)}
          items={localizacoes}
          value={selectedLocalizacao}
        />
        <RNPickerSelect
            style={pickerSelectStyles}
            placeholder={{
              label: 'Estado de Conservação',
              value: null,
            }}
            onValueChange={(value) => setSelectedEstado(value)}
            items={estados}
            value={selectedEstado}
        />
        <RNPickerSelect
            style={pickerSelectStyles}
            placeholder={{
              label: 'Situação',
              value: null,
            }}
            onValueChange={(value) => setSelectedSituacao(value)}
            items={situacoes}
            value={selectedSituacao}
        />
        <TextInput
          style={styles.input}
          placeholder= " Valor"
          value={fields.valor}
          onChangeText={(value) => handleInputChange('valor', value)}
          editable={false}
        />
        <TextInput
            style={styles.input}
            placeholder=" Informações Adicionais"
            value={selectObservacao}
            onChangeText={(value) => setObservacao(value)}
            editable={true} // Define se o TextInput é editável
          />
        
        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <Button
              title={'Limpar'}
              onPress={() => {
                setScanned(false);
                handleAguardandoLeitura();
                setBtnLimparDisabled(false);
                setBtnGravarDisabled(true); // Desabilita o botão gravar
                limparCampo();
                ativaEditable();
                setFields({
                  placa: '',
                  descricao: '',
                  localizacao: '',
                  estado: '',
                  situacao: '',
                  status: ''
                });
              }}
              color="#5f9ea0"
            />
            </View>
            <View style={styles.button}>
              <Button 
              title="Localizar" 
              onPress={handleLocalizar}  
              color="#5f9ea0" 
              disabled={isBtnLimparDisabled} // Desativa o botão se isButtonDisabled for true
              />
            </View>
            <View style={styles.button}>
              <Button 
              title="Gravar" 
              onPress={() => {salvar(); setBtnLimparDisabled(false)}}  
              color="#5f9ea0"
              disabled={isBtnGravarDisabled} // Desativa o botão se isButtonDisabled for true 
              
              />
            </View>
          </View>
        
        {loading && <Text>Carregando...</Text>}
               
      </ScrollView>
    </View>         
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  scannerContainer: {
    flex: 1,         // Para ocupar espaço disponível
    maxHeight: 110,  // Limitar a altura máxima
    minHeight: 10,  // Limitar a altura mínima
    marginBottom: 20,
  },
  camera: {
    flex: 1, // Para ocupar espaço disponível
    padding: 10,
  },
  redLine: {
    position: 'absolute', // Faz a linha sobrepor a câmera
    top: '45%', // Posiciona a linha no meio
    left: 0,
    right: 0,
    height: 1, // Altura da linha
    backgroundColor: 'red', // Cor da linha
  },
  formContainer: {
    flex: 1,
    marginTop: 1,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0,
    marginBottom: 10,
    padding: 10,
    fontSize: 16,
    color: '#5f9ea0',
    backgroundColor: '#fff',
    textAlign: 'left',
  },
  inputDescricao: {
    height: 65,
    borderColor: 'gray',
    borderWidth: 0,
    marginBottom: 10,
    padding: 10,
    fontSize: 16,
    color: '#5f9ea0',
    backgroundColor: '#fff',
    textAlign: 'left',
  },
  inputStatus: {
    height: 20,
    fontSize: 14,
    color: 'red',
    textAlign: 'center',
    paddingBottom: 5
  },
  scannedDataContainer: {
    marginTop: 10,
    padding: 10,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
  },
  buttonContainer: {
    flexDirection: 'row', // Alinha os botões em linha
    justifyContent: 'space-between', // Espaco entre os botões
    width: '100%', // Para ocupar toda a largura
    paddingHorizontal: 10, // Para adicionar espaçamento nas laterais
    marginTop: 30
  },
  button: {
    flex: 1, // Faz com que cada botão ocupe a mesma largura
    marginHorizontal: 5, // Adiciona um pequeno espaço entre os botões
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  text1: {
    fontSize: 12, // Tamanho da fonte
    textAlign: 'center', // Centraliza o texto
  }, 
  busca: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  }
});


// Estilos específicos para o RNPickerSelect
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingHorizontal: 10,
    borderColor: 'gray',
    borderRadius: 5,
    color: '#5f9ea0',
    marginBottom: 8,
    backgroundColor: '#fff',
    textAlign: 'left'
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    borderColor: 'gray',
    borderRadius: 10,
    color: '#5f9ea0',
    marginBottom: 8,
    backgroundColor: '#fff',
    textAlign: 'left'
  },
});


export default Leitura;