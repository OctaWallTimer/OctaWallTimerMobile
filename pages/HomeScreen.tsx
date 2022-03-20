import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import base64 from 'react-native-base64'
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { manager, SERVICE_UUID, CHARACTERISTIC_UUID } from '../BLE';
import { Characteristic } from 'react-native-ble-plx';
import { clearToken, getToken, setToken } from '../Storage';
import { RootStackParamList, User } from '../types';
import { me } from '../API';
import { SafeAreaView } from 'react-navigation';


  
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen(props: Props) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
      getToken().then(token => {
          if(token == null || token.length < 10){
              props.navigation.navigate('Login');
              return;
          }else{
            me().then(user => {
              setUser(user);
            }).catch(() => {
              props.navigation.navigate('Login');
            })
          }

      })
  }, []);
  const logout = useCallback(() => {
    clearToken();
    props.navigation.navigate('Login');
  }, [])
  let [characteristic, setCharacteristic] = useState<Characteristic|null>(null);
  let [wall, setWall] = useState<number>(-1);
  React.useEffect(() => {
    if(characteristic !== null) return;
    const subscription = manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          manager.startDeviceScan(null, null, (error, device) => {
            if (error || !device) {
              console.log("Cant connect to device, " + error?.reason);
              return
            }
            if (device.name === 'OctaWallTimer') {   
              manager.stopDeviceScan();
              device.onDisconnected((error, device) => {
                setCharacteristic(null);
              })
              device.connect()
              .then((device) => {
                  return device.discoverAllServicesAndCharacteristics()
              })
              .then((device) => {
                return device.readCharacteristicForService(SERVICE_UUID, CHARACTERISTIC_UUID);
              })
              .then((characteristic) => {
                setCharacteristic(characteristic);
              })
              .catch((error) => {
                console.log(error?.reason);
              });
            }
          });
          subscription.remove();
        }
    }, true);
    return () => subscription.remove();
  }, [manager, characteristic]);

  useEffect(() => {
    if(characteristic === null){
      return;
    }
    const id = setInterval(() => {
      characteristic?.read().then(c => c.value == null ? -1 : setWall(base64.decode(c.value).charCodeAt(0)));
    }, 500);
    return () => clearInterval(id);
  }, [characteristic]);

  if(user == null){
    return <View style={styles.container}>
      <ActivityIndicator/>
    </View>;
  }
  
  return (
    <SafeAreaView>
      <View style={{padding: 10, backgroundColor: '#444', display: 'flex', flexDirection: 'row'}}>
        <Text style={{color: '#fff', flexGrow: 1}}>Zalogowano jako: {user.name}</Text>
        <Pressable onPress={logout}><Text style={{textDecorationLine: 'underline', color: '#fff'}}>Wyloguj</Text></Pressable>
      </View>
      <View>
        <Text>Połączono: {characteristic === null ? "Nie": "Tak"}</Text>
        {characteristic !== null && <Text>Sciana: {wall}</Text>}
        <StatusBar style="auto" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});