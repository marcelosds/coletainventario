import React, { useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Button, View, Text, StyleSheet, Alert, TextInput, TouchableOpacity } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Checkbox from 'expo-checkbox';

import Leitura from "./leitura";
import Configuracao from "./configuracao";
import Listabens from './listabens';
import { getUserIdByEmail } from '../database/baseSqlite';

const Tab = createBottomTabNavigator();

function Principal() {
  return (
    <Tab.Navigator screenOptions={{ tabBarShowLabel: true }}>
      <Tab.Screen
        name="Leitura das Placas"
        component={Leitura}
        options={{
          headerShown: true,
          headerTitleAlign: 'center',
          headerTintColor: '#029DAF',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Lista de Bens"
        component={Listabens}
        options={{
          headerShadow: true,
          headerTitleAlign: "center",
          headerTintColor: '#029DAF',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="list-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Configurações"
        component={Configuracao}
        options={{
          headerShadow: true,
          headerTitleAlign: "center",
          headerTintColor: '#029DAF',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />

      <Tab.Screen
        name="Sair"
        component={Sair}
        options={{
          headerTitleAlign: "center",
          headerTintColor: '#029DAF',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="exit-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Componente para tela de Logout / Exclusão de conta
const Sair = ({ navigation }) => {
  const [emailText, setEmail] = useState('');
  const [isChecked, setIsChecked] = useState(false);     // controla checkbox
  const [isEditable, setIsEditable] = useState(false);   // controla edição do TextInput

  const handleCheckboxChange = (newValue) => {
    setIsChecked(newValue);
    setIsEditable(newValue);
    if (!newValue) {
      // se desmarcar, limpa e desabilita
      setEmail('');
    }
  };

  //const setEmail = (txt) => setEmailText(txt);

  const handleLogout = async () => {
    try {
      Alert.alert('🚪 Logout!', 'Você foi desconectado com sucesso.');
      navigation.navigate('Login');
    } catch (error) {
      // manter silencioso conforme seu padrão
    }
  };

  const excluirConta = async () => {
    if (!isChecked) {
      Alert.alert('⚠️ Aviso', 'Marque a opção para confirmar que deseja excluir sua conta.');
      return;
    }

    if (emailText) {
      const email = emailText.trim();

      try {
        const res = await getUserIdByEmail(email);

        if (!res.found) {
          Alert.alert('⚠️ Aviso', 'Usuário não encontrado.');
        } else if (res.deleted) {
          Alert.alert('✅ Sucesso', `Usuário ${res.email} foi excluído.`);

          // Deslogar e limpar chaves relacionadas
          await AsyncStorage.removeItem('userEmail');
          await AsyncStorage.removeItem('isEnabled');

          // Redireciona para a tela de login (reset stack)
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } catch (err) {
        console.error(err);
        Alert.alert('❌ Erro!', 'Falha ao excluir o usuário.');
      }
    } else {
      Alert.alert('❌ Erro!', 'Informe o email do usuário.');
    }

    setEmail('');
  };

  const botaoExcluirDesabilitado = !isChecked || emailText.trim() === '';

  return (
    <>
      <View style={styles.container}>
        <Text>Você será desconectado!</Text>
        <Text></Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#029DAF' }]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>🚪 Tem certeza que deseja sair?</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 20 }} />

      {/* Checkbox + label */}
      <View style={styles.check}>
        <Checkbox
          value={isChecked}
          onValueChange={handleCheckboxChange}
          color={isChecked ? '#029DAF' : undefined}
        />
        <Text style={styles.textbox}>Deseja excluir sua conta de acesso?</Text>
      </View>

      {/* E-mail + botão Excluir */}
      <View style={styles.buttonContainer}>
        <TextInput
          style={[styles.input, !isEditable && styles.inputDisabled]}
          placeholder="Digite seu e-mail"
          value={emailText}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={isEditable}
        />

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: '#029DAF' },
            botaoExcluirDesabilitado && styles.buttonDisabled
          ]}
          onPress={excluirConta}
          disabled={botaoExcluirDesabilitado}
        >
          <Text style={styles.buttonText}>🗑️ Excluir Minha Conta</Text>
        </TouchableOpacity>
      </View>
    </>
  );
};

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
  buttonContainer: {
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
    color: '#808080',
    backgroundColor: '#fff'
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6', // cinza claro quando desabilitado
    color: '#9ca3af'
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.5
  },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});

export default Principal;
