import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {ActivityIndicator, Button, Pressable, StyleSheet, Text, View} from 'react-native';
import base64 from 'react-native-base64'
import type { NativeStackScreenProps } from '@react-navigation/native-stack';


import { manager, SERVICE_UUID, CHARACTERISTIC_UUID } from '../BLE';
import { Characteristic } from 'react-native-ble-plx';
import {clearToken, getToken, getWallBindings, setToken} from '../Storage';
import {RootStackParamList, Task, User} from '../types';
import {getTasks, me} from '../API';
import { SafeAreaView } from 'react-navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen(props: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [bindings, setBindings] = useState<{ [id: number]: string } >({});
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
  useEffect(() => {
    if(user == null){
      return;
    }
    getTasks().then(tasks => {
      setTasks(tasks);
    }).catch(error => console.log(error));
  }, [user]);
  useEffect(() => {
    getWallBindings().then(bindings => {
      setBindings(bindings ?? {});
    });
  });
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
      setWall(-1);
      return;
    }
    const id = setInterval(() => {
      characteristic?.read().then(c => setWall(c.value == null ? -1 : base64.decode(c.value).charCodeAt(0)));
    }, 500);
    return () => clearInterval(id);
  }, [characteristic]);


  const [lastWall, setLastWall] = useState(-1);
  const [wallChangeTime, setWallChangeTime] = useState(Date.now());
  useEffect(() => {
    if(lastWall !== wall){
      setWallChangeTime(Date.now());
      setLastWall(wall);
      setElapsedTime(0);
    }
  }, [lastWall, wall])

  const [elapsedTime, setElapsedTime] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setElapsedTime(Date.now() - wallChangeTime);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [wallChangeTime]);

  const formatElapsedtime = (num: number) => {
    num /= 1000;
    if(num < 60){
      return Math.round(num) + "s";
    }
    return Math.round(num/60) + "min";
  }

  const getTask = useCallback(taskID => {
    for (let i = 0; i < tasks.length; i++) {
      if(tasks[i]._id == taskID){
        return tasks[i];
      }
    }
    return null;
  }, [tasks]);

  if(user == null){
    return <View style={styles.container}>
      <ActivityIndicator/>
    </View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{padding: 10, backgroundColor: '#444', display: 'flex', flexDirection: 'row'}}>
        <Text style={{color: '#fff', flexGrow: 1}}>Zalogowano jako: {user.name}</Text>
        <Pressable onPress={logout}><Text style={{textDecorationLine: 'underline', color: '#fff'}}>Wyloguj</Text></Pressable>
      </View>
      <View style={{flex: 1, alignItems: 'center', justifyContent: 'center'}}>
        {wall !== -1 && (
          <View>
            <Text style={{color: '#fff'}}>Sciana: {wall}</Text>
            {bindings[wall] && <Text style={{color: '#fff'}}>Aktualne zadanie: {getTask(bindings[wall])?.name}</Text>}
            <Text style={{color: '#fff'}}>Czas: {formatElapsedtime(elapsedTime)}</Text>
            <Button title={"Przypisz zadanie"} onPress={() => props.navigation.navigate('ChangeWallBinding', {wall})}/>
          </View>
        )}
        <StatusBar style="light" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#222',
    height: '100%',
  },
});
