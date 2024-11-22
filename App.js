import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login from './src/screens/login'; 
import Cadastro from './src/screens/cadastro'; 
import Leitura from './src/screens/leitura'; 
import Configuracao from './src/screens/configuracao';
import Principal from './src/screens/principal';
import RecuperacaoSenha from './src/screens/RecuperacaoSenha';
import Listabens from './src/screens/listabens';


const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">

        <Stack.Screen 
          name="Login" 
          component={Login}
          options={{ headerShown: false }} />

        <Stack.Screen 
          name="Principal" 
          component={Principal} 
          options={{ headerShown: false }} />   

        <Stack.Screen 
          name="Cadastro" 
          component={Cadastro}
          options={{ headerShown: false }} /> 

        <Stack.Screen 
          name="Configuracao" 
          component={Configuracao}
          options={{ headerShown: false }} />

        <Stack.Screen 
          name="Leitura" 
          component={Leitura}
          options={{ headerShown: false }} />

        <Stack.Screen 
          name="Recupera" 
          component={RecuperacaoSenha}
          options={{ headerShown: false }} />

        <Stack.Screen 
          name="Lista" 
          component={Listabens}
          options={{ headerShown: false }} />    
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
