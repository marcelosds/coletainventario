import React, { useEffect, useState } from 'react';
import { View, TextInput, Button, StyleSheet, Text, ScrollView, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { createTable, handleLimpar, carregaData, syncDataWithServer } from '../database/baseSqlite';
import axios from 'axios';


const Configuracao = ( ) => {
  const [apiLink, setApiLink] = useState('');
  const [senhaLink, setSenhaLink] = useState('');
  const [codigoInventario, setCodigoInventario] = useState('');
  const [codigoUnidadeGestora, setCodigoUnidadeGestora] = useState('');
  const [isEditable, setIsEditable] = useState(false); // Estado para controle de edição
  const [isEnabled, setIsEnabled] = useState(false); // Estado para controle de edição
  const [isEnabledSwitch, setIsEnabledSwitch] = useState(false); // Estado inicial do switch



  const toggleSwitch = () => {
    setIsEnabledSwitch(previousState => !previousState); // Inverte o estado do switch
  };
 
  
  // Definir status do campo da API, se poderá ou não ser editado
  const handleCheckboxChange = (newValue) => {
    setIsEditable(newValue);
  };
  // Definir se inventário será offline
  const handleCheckboxChange1 = (newValue) => {
    setIsEnabled(newValue);
    // Se a checkbox for desmarcada, desativa o switch
    if (!newValue) {
      setIsEnabledSwitch(false);
    }
  };

      
  // Carrega e mostra os dados que já estão gravados no AsyncStorage
  useEffect(() => {
    const loadData = async () => {
      try {
        const json = await AsyncStorage.getItem('inventario');
        const inventario = JSON.parse(json);

        if (inventario) {
          setApiLink(inventario.apiLink);
          setSenhaLink(inventario.senhaLink);
          setCodigoInventario(inventario.codigoInventario.toString());
          setCodigoUnidadeGestora(inventario.codigoUnidadeGestora.toString());
          setIsEnabled(inventario.isEnabled); // Restaurar estado do checkbox
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
    };

    loadData(); // Chama a função para carregar os dados
  }, []); // Executa uma vez na montagem do componente


  const obterToken = async (email) => {
    try {
        const response = await axios.post(`${apiLink}/acesso`, { email });
        const tokenObtido = response.data.token;
        
        //console.log(tokenObtido); // Imprime o token

        // Salva o token no AsyncStorage
        await AsyncStorage.setItem('userToken', tokenObtido);

    } catch (error) {
        console.error('Erro ao obter o token:', error.message);
    }
  };

  
  // Função para gravar todos os dados no AsyncStorage os dados informados
  const Save = async () => {

    const token = await AsyncStorage.getItem('userToken');
    
    if (apiLink && senhaLink && codigoInventario && codigoUnidadeGestora) {

      const dispositivo = await axios.get(`${apiLink}/dispositivo`, {
        headers: { Authorization: token },
      });
      const disp = dispositivo.data;
      
      if (senhaLink === disp) {

      const inventario = {
        apiLink,
        senhaLink,
        codigoInventario: parseInt(codigoInventario),
        codigoUnidadeGestora: parseInt(codigoUnidadeGestora),
        isEnabled

      };

      await AsyncStorage.setItem('inventario', JSON.stringify(inventario));

      Alert.alert('Sucesso', 'Configurações salvas.');
    } else {
      Alert.alert('Atenção:', 'Senha da API incorreta!');
    }

      } else {
      Alert.alert('Erro', 'Preencha todos os campos!');
    }
  };


  // Gravar as configurações informadas
  const Gravar = async () => {

      createTable(); //Cria tabela INVENTARIOITEM caso não exista
      Save();
      obterToken();
   };


  return (
    
    <ScrollView style={styles.container}>
      <View style={styles.box1}>
        <Text style={styles.title}>Endereço e Senha da API:</Text>
         <TextInput
          style={styles.input}
          placeholder="Endereço da API"
          value={apiLink}
          onChangeText={setApiLink}
          editable={isEditable} />

        <TextInput
          style={styles.input}
          placeholder="Senha da API"
          value={senhaLink}
          onChangeText={setSenhaLink}
          editable={isEditable}
          secureTextEntry={true} // Isso garante que a senha apareça como asteriscos
          />
          
        <View style={styles.check}>  
          <Checkbox
            value={isEditable}
            onValueChange={(newValue) => handleCheckboxChange(newValue)} />
            <Text style={styles.textbox}>Alterar endereço e/ou senha da API?</Text>
        </View>

        <View style={styles.dados}>
          <Text style={styles.title1}>Nº Inventário:</Text>
          <TextInput
            style={styles.input1}
            placeholder=""
            value={codigoInventario}
            keyboardType="numeric"
            onChangeText={setCodigoInventario} />
          <Text style={styles.title2}>Nº UG:</Text>
          <TextInput
            style={styles.input2}
            placeholder=""
            value={codigoUnidadeGestora}
            keyboardType="numeric"
            onChangeText={setCodigoUnidadeGestora} />
            <Text></Text> 
        </View>
        <View style={styles.check}>  
            <Checkbox
              value={isEnabled}
              onValueChange={handleCheckboxChange1} />
              <Text style={styles.textbox}>Trabalhar Offline</Text>
          </View>
        <Button 
          title="GRAVAR" 
          style={styles.button}
          onPress={Gravar} 
          color="#5f9ea0"
        />
        <Text></Text>
        </View>
        <Text></Text>
        <View style={styles.box2}>
          <View style={styles.switch}> 
            <Text style={styles.textbox}>Sincronizar Informações? </Text>
            <Switch
              trackColor={{ false: "#767577", true: "#81b0ff" }} // Cor da trilha do switch
              thumbColor={isEnabledSwitch ? "#20b2aa" : "#f4f3f4"} // Cor do botão do switch
              ios_backgroundColor="#3e3e3e"
              onValueChange={toggleSwitch} // Chama a função para alternar o estado
              value={isEnabledSwitch} // valor atual do switch
              disabled={!isEnabled} // Desativa o switch se a checkbox não estiver marcada
            />  
          </View>
          <Button 
            title="Importar Inventário" 
            style={styles.button} 
            onPress={carregaData} 
            color="#5f9ea0" 
            disabled={!isEnabledSwitch}  
          />
          <Text></Text>
          <Button 
            title="Exportar Inventário" 
            style={styles.button} 
            onPress={syncDataWithServer} 
            color="#5f9ea0" 
            disabled={!isEnabledSwitch}  
          />
          <Text></Text>
        </View>
        <Text></Text>
        <Text></Text>
        <View style={styles.box2}>
        <Button 
            title="Limpar Dados do Coletor" 
            style={styles.button} 
            onPress={handleLimpar} 
            color="#5f9ea0"
            disabled={!isEnabledSwitch}  
          />
        </View>
          
      </ScrollView>
    );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 5,
    backgroundColor: '#f0f0f0',

  },
  box1: {
    flex: 1, // Ocupará 50% da tela
    padding: 10,
    backgroundColor: '#d3d3d3', // Cor de fundo
    borderRadius: 10

  },
  box2: {
    flex: 1, // Ocupará 50% da tela
    padding: 10,
    backgroundColor: '#d3d3d3', // Cor de fundo
    borderRadius: 10

  },
  title: {
    fontSize: 16,
    marginBottom: 1,
  },
  title1: {
    fontSize: 16,
    marginTop: 10
  },
  title2: {
    fontSize: 16,
    marginTop: 10,
    paddingStart: 75
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    marginBottom: 10,
    paddingHorizontal: 10,
    backgroundColor: '#f8f8ff'
  },
  input1: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    marginBottom: 10,
    paddingHorizontal: 10,
    marginStart: 5,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#f8f8ff'
  },
  input2: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 0.5,
    marginBottom: 10,
    paddingHorizontal: 10,
    marginStart: 5,
    width: 60,
    textAlign: 'center',
    backgroundColor: '#f8f8ff'
  },
  button: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0'
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  switch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    paddingBottom: 10
  },
  dados: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 20
  },
  textbox: {
    marginStart: 8,
    color: 'red'
  },
  
});

// Exporta o componente para uso em outras partes do aplicativo
export default Configuracao;