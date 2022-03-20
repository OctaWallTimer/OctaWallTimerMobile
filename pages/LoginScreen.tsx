import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { login } from '../API';
import { setToken } from '../Storage';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen(props: Props) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const onLogin = useCallback(() => {
    setLoading(true);
    login(name, password).then(token => {
      setLoading(false);
      props.navigation.navigate('Home');
    }).catch(error => {
      setLoading(false);
      setError(error);
    })
  }, [name, password]);
  const onRegister = useCallback(() => {
      props.navigation.navigate('Register');
  }, []);
  return (
    <View style={styles.container}>
      <Text style={{fontSize: 25, marginBottom: 40}}>Zaloguj się</Text>
      <Text style={{color: '#ff3020'}}>{error}</Text>
      <View>
        <Text>Login</Text>
        <TextInput style={styles.input} onChangeText={text => setName(text)} value={name} editable={!loading}/>
      </View>
      <View>
        <Text>Hasło</Text>
        <TextInput style={styles.input} onChangeText={text => setPassword(text)} value={password} editable={!loading} secureTextEntry={true}/>
      </View>
      <Pressable onPress={onLogin} style={{backgroundColor: '#ff5010', paddingHorizontal: 20, paddingVertical: 5,marginVertical: 10, borderRadius: 8}}>
        <Text style={{color: '#fff'}}>Zaloguj</Text>
      </Pressable>
      <Pressable onPress={onRegister} style={{marginVertical: 10, borderRadius: 8}}>
        <Text style={{color: '#666'}}>Nie masz konta? <Text style={{textDecorationColor: '#000', textDecorationStyle: 'solid', textDecorationLine: 'underline'}}>Zarejestruj się</Text></Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#ffffff', 
    borderColor: '#ddd', 
    borderWidth: 2, 
    borderRadius:8, 
    padding:10, 
    height: 40, 
    width: 200,
  }
});