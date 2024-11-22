import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Leitura from "./leitura";
import Configuracao from "./configuracao";
import Listabens from './listabens';
import { Button, View, Text, StyleSheet, Alert, TextInput } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';
import { getUserIdByEmail } from '../database/baseSqlite';


const Tab = createBottomTabNavigator();


// Definir se usuário pode rá ser excluido ou não
const handleCheckboxChange = (newValue) => {
setIsEditable(newValue);
};

function Principal() {

  const [apiLink, setApiLink] = useState('');  
  const [isConnected, setIsConnected] = useState(false); // Estado para rastrear a conexão
  
  // Carrega os dados da configuração para o AsyncStorage
  useFocusEffect(
    React.useCallback(() => {
    const loadData = async () => {
      try {
        const json = await AsyncStorage.getItem('inventario');
        const inventario = JSON.parse(json);

        if (inventario) {
          setApiLink(inventario.apiLink);
      
        }
      } catch (error) {
        Alert.alert('Erro', 'Localizações e Situações não foram carregadas!');
      }
    };

    loadData(); // Chama a função para carregar os dados
    }, [])); // Executa uma vez na montagem do componente

    // Aqui você pode usar um efeito para verificar a conexão com a API periodicamente ou em um evento
  useEffect(() => {
    const checkConnection = async () => {
      const token = await AsyncStorage.getItem('userToken');
      try {
        if (apiLink) {
          const response = await fetch(`${apiLink}/inventario`, {
            headers: { Authorization: token },
          });
          if (response.ok) {
            setIsConnected(true);
          } else {
            setIsConnected(false);
          }
        }
      } catch (error) {
        //Alert.alert('Atenção:', 'Você está sem conexão com o servidor!');
        setIsConnected(false);
      }
    };

    checkConnection(); // Chama a função para verificar a conexão

    const interval = setInterval(checkConnection, 30000); // Verifica a cada 30s

    return () => clearInterval(interval); // Limpeza para evitar vazamentos de memória
  }, [apiLink]); // Adiciona apiLink como dependência


  useEffect(() => {
    //console.log("isConnected:", isConnected); // Log do estado isConnected
  }, [isConnected]); // Log quando isConnected mudar


    return <Tab.Navigator screenOptions={{ tabBarShowLabel: true }}>

        <Tab.Screen name="Leitura das Placas" component={Leitura} options={{
            headerShown: true, headerTitleAlign: 'center',
            headerRight: () => (
              <View style={{ marginRight: 20 }}>
                <Feather 
                  name={isConnected ? "wifi" : "wifi-off"} 
                  size={20} 
                  color={isConnected ? "green" : "red"} 
                />
              </View>
            ),
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="search-outline" size={size} color={color} />
            ),
        }} />

        <Tab.Screen name="Lista de Bens" component={Listabens} options={{
            headerShadow: true, headerTitleAlign: "center",
            headerRight: () => (
              <View style={{ marginRight: 20 }}>
                <Feather 
                  name={isConnected ? "wifi" : "wifi-off"} 
                  size={20} 
                  color={isConnected ? "green" : "red"} 
                />
              </View>
            ),
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="list-outline" size={size} color={color} />
            ),
        }} />           

        <Tab.Screen name="Configurações" component={Configuracao} options={{
            headerShadow: true, headerTitleAlign: "center",
            headerRight: () => (
              <View style={{ marginRight: 20 }}>
                <Feather 
                  name={isConnected ? "wifi" : "wifi-off"} 
                  size={20} 
                  color={isConnected ? "green" : "red"} 
                />
              </View>
            ),
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
            ),
        }} />

        <Tab.Screen name="Sair" component={Sair} options={{
            headerTitleAlign: "center",
            headerRight: () => (
              <View style={{ marginRight: 20 }}>
                <Feather 
                  name={isConnected ? "wifi" : "wifi-off"} 
                  size={20} 
                  color={isConnected ? "green" : "red"} 
                />
              </View>
            ),
            tabBarIcon: ({ color, size }) => (
                <Ionicons name="exit-outline" size={size} color={color} />
            ),
        }} />
            
    </Tab.Navigator>



}

// Componente para tela de Logout
const Sair = ({ navigation }) => {

    const [emailText, setEmail] = useState('');

    const [isChecked, setIsChecked] = useState(false); // Estado da Checkbox
    const [isEditable, setIsEditable] = useState(false); // Estado para controle de edição

    const handleCheckboxChange = (newValue) => {
      setIsChecked(newValue); // Atualiza o estado da Checkbox
      setIsEditable(newValue);
    };

    const handleLogout = async () => {
      // Aqui você pode adicionar lógica para efetuar o logout,
      //const auth = getAuth();
      try {
        //await signOut(auth);
        Alert.alert('Logout', 'Você foi desconectado com sucesso!');
        navigation.navigate('Login'); // Navegue para a tela de login
        // Redirecionar ou atualizar o estado se necessário
      } catch (error) {
        //console.error('Erro ao fazer logout:', error);
        //Alert.alert('Erro', 'Não foi possível deslogar. Tente novamente.');
      }
      
    };

   
    const excluirConta = async () => {

      if ( emailText ) {

        const email = emailText;

        await getUserIdByEmail(email);

      } else {
        Alert.alert('Erro:', 'Informe o email do usuário!');
      }

      setEmail('');

    };

    
    return (
      <>
      <View style={styles.container}>
        <Text>Você será desconectado!</Text>
        <Text></Text>
        <Button title="Tem certeza que deseja sair?" onPress={handleLogout} color="#5f9ea0" />
      </View>
      <View style={{ padding: 20 }}>
      
      </View>
      <View style={styles.check}>  
        <Checkbox
          value={isChecked}
          onValueChange={handleCheckboxChange} // Atualiza o estado da Checkbox
        />
        <Text style={styles.textbox}>Deseja excluir sua conta de acesso?</Text>
      </View>
     
      <View style={styles.button}>
        <TextInput
          style={styles.input}
          placeholder="Digite seu e-mail"
          value={emailText}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={isEditable}
        />
        <Button 
          title="Excluir Minha Conta"
          onPress={excluirConta} color="#5f9ea0" // Chama a função de exclusão quando pressionado
          disabled={!isChecked} // Desativa o botão se a Checkbox não estiver marcada
        />
      </View>
      </>
    );
}
 


const styles = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      paddingTop: 250,
    },
    check: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingStart: 20
    },
    textbox: {
      marginLeft: 8,
      color: 'red'
    },
    button: {
      paddingBottom: 20,
      paddingHorizontal: 20
    },
    input: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      marginBottom: 10,
      paddingHorizontal: 10,
      borderRadius: 5,
    },
  });

export default Principal;