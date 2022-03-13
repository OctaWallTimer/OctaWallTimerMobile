import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import base64 from 'react-native-base64'

import { manager, SERVICE_UUID, CHARACTERISTIC_UUID } from './BLE';
import { Characteristic } from 'react-native-ble-plx';

export default function App() {
  let [characteristic, setCharacteristic] = useState<Characteristic|null>(null);
  let [wall, setWall] = useState<number>(-1);
  React.useEffect(() => {
    const subscription = manager.onStateChange((state) => {
        if (state === 'PoweredOn') {
          manager.startDeviceScan(null, null, (error, device) => {
            if (error || !device) {
              console.log("Cant connect to device, " + error?.reason);
              return
            }
            if (device.name === 'OctaWallTimer') {   
              manager.stopDeviceScan();
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
  }, [manager]);

  useEffect(() => {
    const id = setInterval(() => {
      characteristic?.read().then(c => c.value == null ? -1 : setWall(base64.decode(c.value).charCodeAt(0)));
    }, 500);
    return () => clearInterval(id);
  }, [characteristic]);


  
  return (
    <View style={styles.container}>
      <Text>Sciana: {wall}</Text>
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
});