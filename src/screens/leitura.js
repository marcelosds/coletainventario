// leitura.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import RNPickerSelect from 'react-native-picker-select';
import { useFocusEffect } from '@react-navigation/native';
import {
  getLocais,
  getSituacoes,
  getEstados,
  getBens,
  getLocalizaSQLite,
  atualizarInventario
} from '../database/baseSqlite';

const Leitura = () => {
  const [texto, setTexto] = useState("Aguardando leitura...");
  const [corTexto, setCorTexto] = useState("#008000");
  const [bensData, setBensData] = useState([]);
  const [isBtnLimparDisabled, setBtnLimparDisabled] = useState(false);
  const [isBtnGravarDisabled, setBtnGravarDisabled] = useState(true);
  const [isEditable, setIsEditable] = useState(true);

  const [hasPermission, setHasPermission] = useState(null);
  const [cameraActive, setCameraActive] = useState(false); // << controla render da câmera
  const [scanned, setScanned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [situacoes, setSituacoes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [selectedLocalizacao, setSelectedLocalizacao] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [selectedSituacao, setSelectedSituacao] = useState(null);
  const [fields, setFields] = useState({ placa:'', codigo:'', descricao:'' });

  // Pede permissão de câmera na montagem
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch {
        setHasPermission(false);
      }
    })();
  }, []);

  // Carrega dados locais ao focar a tela e ativa a câmera
  useFocusEffect(React.useCallback(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const locais = await getLocais();
        if (!isMounted) return;
        setLocalizacoes(locais.map(l => ({ label: l.nome, value: parseInt(l.codigo) })));

        const sit = await getSituacoes();
        if (!isMounted) return;
        setSituacoes(sit.map(s => ({ label: s.nome, value: parseInt(s.codigo) })));

        const est = await getEstados();
        if (!isMounted) return;
        setEstados(est.map(e => ({ label: e.dsEstadoConser, value: e.cdEstadoConser })));

        const bens = await getBens();
        if (!isMounted) return;
        setBensData(bens || []);
      } catch (error) {
        console.error('Erro carregar dados locais', error);
        Alert.alert('Erro', 'Não foi possível carregar dados locais.');
      }
    };
    // Ao entrar na tela: reseta e ativa o scanner
    setScanned(false);
    setCameraActive(true);
    handleAguardandoLeitura();
    load();

    // Ao sair da tela: desativa câmera
    return () => {
      isMounted = false;
      setCameraActive(false);
    };
  }, []));

  const handleLeituraRealizada = () => { setTexto("Leitura realizada!"); setCorTexto("red"); };
  const handleAguardandoLeitura = () => { setTexto("Aguardando leitura..."); setCorTexto("green"); };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);          // pausa o scanner
    setLoading(true);
    fetchBemData(String(data || '').trim());
    handleLeituraRealizada();
  };

  const fetchBemData = async (placaOuCodigo) => {
    try {
      const bem = await getLocalizaSQLite(placaOuCodigo);
      setFields({
        placa: bem.placa?.trim() || '',
        codigo: bem.codigo?.toString() || '',
        descricao: bem.descricao || ''
      });
      setSelectedEstado(bem.codigoEstado);
      setSelectedLocalizacao(bem.codigoLocalizacao);
      setSelectedSituacao(bem.codigoSituacao);
      setBtnGravarDisabled(false);
      setIsEditable(false);
    } catch (error) {
      Alert.alert('Atenção:', 'Bem não localizado nesse inventário!');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalizar = () => {
    const placaInput = fields.placa.trim();
    if (!placaInput) return Alert.alert('Atenção', 'Insira Placa ou Código!');
    const bemEncontrado = bensData.find(bem => (bem.placa || '').trim() === placaInput || bem.codigo?.toString() === placaInput);
    if (bemEncontrado) {
      fetchBemData(bemEncontrado.codigo || bemEncontrado.placa);
      handleLeituraRealizada();
      setBtnLimparDisabled(true);
      setBtnGravarDisabled(false);
      setIsEditable(false);
    } else {
      Alert.alert('Atenção:', 'Bem não localizado nesse inventário!');
    }
  };

  const handleInputChange = (field, value) => setFields({ ...fields, [field]: value });

  const salvar = async () => {
    await saveData();
  };

  const saveData = async () => {
    try {
      const placaInput = fields.placa.trim() ? fields.placa.trim() : fields.codigo;

      // pega os labels atuais dos pickers
      const localLabel  = localizacoes.find(o => o.value === selectedLocalizacao)?.label ?? null;
      const estadoLabel = estados.find(o => o.value === selectedEstado)?.label ?? null;
      const situLabel   = situacoes.find(o => o.value === selectedSituacao)?.label ?? null;

      await atualizarInventario(
        selectedLocalizacao,
        selectedEstado,
        selectedSituacao,
        null,            // obs
        placaInput,
        null,            // status
        {
          localizacaoNome: localLabel,
          estadoConservacaoNome: estadoLabel,
          situacaoNome: situLabel
        }
      );

      Alert.alert('Sucesso', 'Dados do bem salvos com sucesso.');

      // Limpa e reativa o scanner para nova leitura
      setFields({ placa:'', codigo:'', descricao:'' });
      setSelectedLocalizacao(null);
      setSelectedEstado(null);
      setSelectedSituacao(null);
      setIsEditable(true);
      setBtnGravarDisabled(true);
      handleAguardandoLeitura();
      setScanned(false);        // libera para próxima leitura
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Não foi possível salvar os dados do bem.');
      // Mesmo em erro, permita tentar outra leitura
      setScanned(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { alignItems:'center', justifyContent:'center' }]}>
        <ActivityIndicator size="large" color="#4682b4" />
        <Text style={{ marginTop: 8 }}>Solicitando permissão da câmera...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return <Text style={{ padding: 16 }}>Sem acesso à câmera. Conceda a permissão nas configurações do app.</Text>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.scannerContainer}>
        {cameraActive && (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ["qr","ean13","code128","datamatrix","pdf417"] }}
          />
        )}
        <View style={styles.redLine} />
        <Text style={[styles.text1, { color: corTexto }]}>{texto}</Text>
      </View>

      <ScrollView style={styles.formContainer}>
        <View style={styles.busca}>
          <TextInput
            style={styles.input}
            placeholder=" Digite a Placa ou Código"
            value={fields.placa}
            onChangeText={(v)=>handleInputChange('placa',v)}
            editable={isEditable}
          />
          <TextInput
            style={styles.input}
            placeholder=" Código"
            value={fields.codigo}
            editable={false}
          />
        </View>

        <TextInput
          style={styles.inputDescricao}
          multiline
          numberOfLines={2}
          placeholder=" Descrição"
          value={fields.descricao}
          editable={false}
        />

        <RNPickerSelect
          placeholder={{ label:'Localização', value: null }}
          onValueChange={(v)=>setSelectedLocalizacao(v)}
          items={localizacoes}
          value={selectedLocalizacao}
        />
        <RNPickerSelect
          placeholder={{ label:'Estado de Conservação', value: null }}
          onValueChange={(v)=>setSelectedEstado(v)}
          items={estados}
          value={selectedEstado}
        />
        <RNPickerSelect
          placeholder={{ label:'Situação', value: null }}
          onValueChange={(v)=>setSelectedSituacao(v)}
          items={situacoes}
          value={selectedSituacao}
        />

        <View style={styles.buttonContainer}>
          <View style={styles.button}>
            <Button
              title={'Limpar'}
              onPress={() => {
                setScanned(false);
                handleAguardandoLeitura();
                setBtnLimparDisabled(false);
                setBtnGravarDisabled(true);
                setSelectedLocalizacao(null);
                setSelectedEstado(null);
                setSelectedSituacao(null);
                setFields({ placa:'', codigo:'', descricao:'' });
                setIsEditable(true);
              }}
              color="#4682b4"
            />
          </View>

          <View style={styles.button}>
            <Button
              title="Localizar"
              onPress={handleLocalizar}
              color="#4682b4"
              disabled={isBtnLimparDisabled}
            />
          </View>

          <View style={styles.button}>
            <Button
              title="Gravar"
              onPress={() => { salvar(); setBtnLimparDisabled(false); }}
              color="#4682b4"
              disabled={isBtnGravarDisabled}
            />
          </View>
        </View>

        {loading && <Text>Carregando...</Text>}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container:{ flex:1, justifyContent:'center', padding:20 },
  scannerContainer:{ flex:1, maxHeight:110, minHeight:10, marginBottom:20 },
  camera:{ flex:1, padding:10 },
  redLine:{ position:'absolute', top:'45%', left:0, right:0, height:1, backgroundColor:'red' },
  text1:{ marginTop:6, textAlign:'center' },
  formContainer:{ flex:1, marginTop:1 },
  input:{ height:40, marginBottom:10, padding:10, fontSize:16, backgroundColor:'#fff', textAlign:'left' },
  inputDescricao:{ height:65, marginBottom:10, padding:10, fontSize:16, backgroundColor:'#fff' },
  buttonContainer:{ flexDirection:'row', justifyContent:'space-between' , marginTop:40 },
  button:{ flex:1, marginHorizontal:4 }
});

export default Leitura;
