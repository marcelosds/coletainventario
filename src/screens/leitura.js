// leitura.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput,TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
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
  const [isInputEmpty, setIsInputEmpty] = useState(true); // controla Limpar e Localizar
  const [isBtnGravarDisabled, setBtnGravarDisabled] = useState(true);
  const [isEditable, setIsEditable] = useState(true);

  const [hasPermission, setHasPermission] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanned, setScanned] = useState(false);

  const [loading, setLoading] = useState(false);
  const [localizacoes, setLocalizacoes] = useState([]);
  const [situacoes, setSituacoes] = useState([]);
  const [estados, setEstados] = useState([]);
  const [selectedLocalizacao, setSelectedLocalizacao] = useState(null);
  const [selectedEstado, setSelectedEstado] = useState(null);
  const [selectedSituacao, setSelectedSituacao] = useState(null);
  const [fields, setFields] = useState({ placa:'', codigo:'', descricao:'' });

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
        Alert.alert('❌ Erro', 'Não foi possível carregar dados locais.');
      }
    };

    setScanned(false);
    setCameraActive(true);
    handleAguardandoLeitura();
    load();

    return () => {
      isMounted = false;
      setCameraActive(false);
    };
  }, []));

  const handleLeituraRealizada = () => { setTexto("Leitura realizada!"); setCorTexto("red"); };
  const handleAguardandoLeitura = () => { setTexto("Aguardando leitura..."); setCorTexto("green"); };

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
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
      setIsInputEmpty(false); // habilita botões
    } catch (error) {
      Alert.alert('⚠️ Atenção:', 'Bem não localizado nesse inventário!');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalizar = () => {
    const placaInput = fields.placa.trim();
    if (!placaInput) return Alert.alert('⚠️ Atenção', 'Insira Placa ou Código!');
    const bemEncontrado = bensData.find(bem => (bem.placa || '').trim() === placaInput || bem.codigo?.toString() === placaInput);
    if (bemEncontrado) {
      fetchBemData(bemEncontrado.codigo || bemEncontrado.placa);
      handleLeituraRealizada();
      setBtnGravarDisabled(false);
      setIsEditable(false);
    } else {
      Alert.alert('⚠️ Atenção:', 'Bem não localizado nesse inventário!');
    }
  };

  const handleInputChange = (field, value) => {
    setFields({ ...fields, [field]: value });
    if (field === 'placa') {
      setIsInputEmpty(value.trim() === '');
    }
  };

  const salvar = async () => {
    await saveData();
  };

  const saveData = async () => {
    try {
      const placaInput = fields.placa.trim() ? fields.placa.trim() : fields.codigo;
      const localLabel  = localizacoes.find(o => o.value === selectedLocalizacao)?.label ?? null;
      const estadoLabel = estados.find(o => o.value === selectedEstado)?.label ?? null;
      const situLabel   = situacoes.find(o => o.value === selectedSituacao)?.label ?? null;

      await atualizarInventario(
        selectedLocalizacao,
        selectedEstado,
        selectedSituacao,
        null,
        placaInput,
        null,
        {
          localizacaoNome: localLabel,
          estadoConservacaoNome: estadoLabel,
          situacaoNome: situLabel
        }
      );

      Alert.alert('✅ Sucesso!', 'Dados do bem salvos com sucesso.');

      setFields({ placa:'', codigo:'', descricao:'' });
      setSelectedLocalizacao(null);
      setSelectedEstado(null);
      setSelectedSituacao(null);
      setIsEditable(true);
      setBtnGravarDisabled(true);
      setIsInputEmpty(true); // desabilita após salvar
      handleAguardandoLeitura();
      setScanned(false);
    } catch (error) {
      console.error(error);
      Alert.alert('❌ Erro!', 'Não foi possível salvar os dados do bem.');
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
          style={pickerSelectStyles}
          placeholder={{ label:'Localização', value: null }}
          onValueChange={(v)=>setSelectedLocalizacao(v)}
          items={localizacoes}
          value={selectedLocalizacao}
        />
        <RNPickerSelect
          style={pickerSelectStyles}
          placeholder={{ label:'Estado de Conservação', value: null }}
          onValueChange={(v)=>setSelectedEstado(v)}
          items={estados}
          value={selectedEstado}
        />
        <RNPickerSelect
          style={pickerSelectStyles}
          placeholder={{ label:'Situação', value: null }}
          onValueChange={(v)=>setSelectedSituacao(v)}
          items={situacoes}
          value={selectedSituacao}
        />

        {loading && <Text>Carregando...</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerBtn, isInputEmpty && styles.footerBtnDisabled]}
          activeOpacity={0.8}
          onPress={() => {
            setScanned(false);
            handleAguardandoLeitura();
            setBtnGravarDisabled(true);
            setSelectedLocalizacao(null);
            setSelectedEstado(null);
            setSelectedSituacao(null);
            setFields({ placa: '', codigo: '', descricao: '' });
            setIsEditable(true);
            setIsInputEmpty(true);
          }}
          disabled={isInputEmpty}
        >
          <Text style={styles.buttonText}>❌ Limpar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, isInputEmpty && styles.footerBtnDisabled]}
          activeOpacity={0.8}
          onPress={handleLocalizar}
          disabled={isInputEmpty}
        >
          <Text style={styles.buttonText}>🔍 Localizar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerBtn, isBtnGravarDisabled && styles.footerBtnDisabled]}
          activeOpacity={0.8}
          onPress={() => { salvar(); }}
          disabled={isBtnGravarDisabled}
        >
          <Text style={styles.buttonText}>💾 Gravar</Text>
        </TouchableOpacity>
      </View>
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
  input:{ height:40, marginBottom:10, padding:10, fontSize:16, backgroundColor:'#fff', textAlign:'left', color:'#808080' },
  inputDescricao:{ height:65, marginBottom:10, padding:10, fontSize:16, color:'#808080', backgroundColor:'#fff' },
  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 40,
    backgroundColor: '#f2efefff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 }, elevation: 8,
  },
  footerBtn: {
    flex: 1, marginHorizontal: 6, backgroundColor: '#029DAF',
    paddingVertical: 14, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  footerBtnDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});

const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingHorizontal: 10, borderColor: 'gray', borderRadius: 5, color: '#808080', marginBottom: 8, backgroundColor: '#fff', textAlign: 'left' },
  inputAndroid: { fontSize: 16, paddingHorizontal: 10, borderColor: 'gray', borderRadius: 10, color: '#808080', marginBottom: 8, backgroundColor: '#fff', textAlign: 'left' },
});

export default Leitura;
