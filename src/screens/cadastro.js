import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Alert, Text, Image } from 'react-native';
import { addUser } from '../database/baseSqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Cadastro = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [logoUri, setLogoUri] = useState(null);


  useEffect(() => {
    const loadLogo = async () => {
      const storedLogoUri = await AsyncStorage.getItem('logoUri');
      if (storedLogoUri) {
        setLogoUri(storedLogoUri);
        console.log(storedLogoUri);
      }
    };

    loadLogo();
  }, []);

  const handleCadastro = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('⚠️ Atenção!', 'Por favor, preencha todos os campos.');
      return;
    }

    try {
      await addUser(fullName, email, password);
      Alert.alert('✅ Sucesso!', 'Usuário registrado com sucesso.');
      navigation.navigate('Login'); // Redireciona para a tela de login após o cadastro
    } catch (error) {
      Alert.alert('❌ Erro!', 'Erro ao registrar usuário. O e-mail pode já estar em uso.');
    }
  
    setFullName('');
    setEmail('');
    setPassword('');
  };

  return (
    <View style={styles.container}>
        <View style={styles.header}>
          {logoUri && <Image source={{ uri: logoUri }} style={styles.logo} />}
          <Text style={styles.title}>Coletor de Dados Patrimoniais</Text>
        </View>
      <TextInput
        style={styles.input}
        placeholder="Nome Completo"
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={true}
      />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#029DAF' }]}
          onPress={handleCadastro}
          >
          <Text style={styles.buttonText}>👤 Cadastrar</Text>
        </TouchableOpacity>
        <Text 
            style={styles.link} 
            onPress={() => navigation.navigate('Login')} // Navegar de volta para Login
        >
            Já tem uma conta? Faça login.
        </Text>
      </View>
    </View>
  );
};

// Estilos para a tela
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
    color:"#029DAF",
    fontWeight: '700'
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    color:'#808080'
  },
  link: {
    marginTop: 20,
    color: '#029DAF',
    textAlign: 'center',
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginBottom: 60
  },
  logo: {
    width: 240,
    height: 200,
    marginBottom: 20,
    borderRadius: 10,
    resizeMode: 'stretch',
  },
  buttonContainer: {
    marginTop: 50
  },
  button: { padding: 15, borderRadius: 8, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
});

export default Cadastro;
