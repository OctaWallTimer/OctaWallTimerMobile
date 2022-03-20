import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { Button, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;


export default function RegisterScreen(props: Props) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const onRegister = useCallback(() => {
    console.log(name, password);
  }, [name, password]);
  const onLogin = useCallback(() => {
      props.navigation.navigate('Login');
  }, []);
  return (
    <View style={styles.container}>
      <Text style={{fontSize: 25, marginBottom: 40}}>Zarejestruj się</Text>
      <View>
        <Text>Login</Text>
        <TextInput style={styles.input} onChangeText={text => setName(text)} value={name} focusable={true}/>
      </View>
      <View>
        <Text>Hasło</Text>
        <TextInput style={styles.input} onChangeText={text => setPassword(text)} value={password}/>
      </View>
      <View>
        <Text>Potwierdź hasło</Text>
        <TextInput style={styles.input} onChangeText={text => setPassword2(text)} value={password2}/>
      </View>
      <Pressable onPress={onRegister} style={{backgroundColor: '#ff5010', paddingHorizontal: 20, paddingVertical: 5,marginVertical: 10, borderRadius: 8}}>
        <Text style={{color: '#fff'}}>Zarejestruj</Text>
      </Pressable>
      <Pressable onPress={onLogin} style={{marginVertical: 10, borderRadius: 8}}>
        <Text style={{color: '#666'}}>Masz juz konto? <Text style={{textDecorationColor: '#000', textDecorationStyle: 'solid', textDecorationLine: 'underline'}}>Zaloguj się</Text></Text>
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