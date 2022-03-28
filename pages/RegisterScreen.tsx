import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useState} from 'react';
import {Button, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {register} from '../API';
import {RootStackParamList} from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;


export default function RegisterScreen(props: Props) {
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [password2, setPassword2] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const onRegister = useCallback(() => {
        if (password !== password2) {
            setError("Hasła się nie zgadzają!");
            return;
        }
        setLoading(true);

        register(name, password).then(token => {
            setLoading(false);
            props.navigation.navigate('Home');
        }).catch(error => {
            setLoading(false);
            setError(error);
        })
    }, [name, password, password2]);
    const onLogin = useCallback(() => {
        props.navigation.navigate('Login');
    }, []);
    return (
        <View style={styles.container}>
            <Text style={{fontSize: 25, marginBottom: 30, color: '#ffffff'}}>Zarejestruj się</Text>
            <Text style={{color: '#ff3020', marginBottom: 10}}>{error}</Text>
            <View style={{marginBottom: 10}}>
                <Text style={{color: '#fff'}}>Login</Text>
                <TextInput style={styles.input} onChangeText={text => setName(text)} value={name} editable={!loading}/>
            </View>
            <View style={{marginBottom: 10}}>
                <Text style={{color: '#fff'}}>Hasło</Text>
                <TextInput style={styles.input} onChangeText={text => setPassword(text)} value={password}
                           editable={!loading} secureTextEntry={true}/>
            </View>
            <View style={{marginBottom: 10}}>
                <Text style={{color: '#fff'}}>Potwierdź hasło</Text>
                <TextInput style={styles.input} onChangeText={text => setPassword2(text)} value={password2}
                           secureTextEntry={true}/>
            </View>
            <Pressable onPress={onRegister} style={{
                backgroundColor: '#ff5010',
                paddingHorizontal: 20,
                paddingVertical: 5,
                marginVertical: 10,
                borderRadius: 8
            }}>
                <Text style={{color: '#fff'}}>Zarejestruj</Text>
            </Pressable>
            <Pressable onPress={onLogin} style={{marginVertical: 10, borderRadius: 8}}>
                <Text style={{color: '#666'}}>Masz juz konto? <Text style={{
                    textDecorationColor: '#000',
                    textDecorationStyle: 'solid',
                    textDecorationLine: 'underline'
                }}>Zaloguj się</Text></Text>
            </Pressable>
            <StatusBar style="light"/>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        backgroundColor: '#333',
        color: '#fff',
        borderColor: '#666',
        borderWidth: 2,
        borderRadius: 8,
        padding: 10,
        height: 40,
        width: 200,
    }
});
