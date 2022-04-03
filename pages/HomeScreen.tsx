import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import base64 from 'react-native-base64'
import type {NativeStackScreenProps} from '@react-navigation/native-stack';


import {manager, SERVICE_UUID, CHARACTERISTIC_UUID} from '../BLE';
import {Characteristic} from 'react-native-ble-plx';
import {clearToken, getToken, getWallBindings, setToken} from '../Storage';
import {RootStackParamList, Task, TaskTime, User} from '../types';
import {getTasks, getTaskTimes, me, saveTaskTime} from '../API';
import {SafeAreaView} from 'react-navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen(props: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [taskTimes, setTaskTimes] = useState<TaskTime[]>([]);
    const [bindings, setBindings] = useState<{ [id: number]: string }>({});
    useEffect(() => {
        let isMounted = true;
        getToken().then(token => {
            if (!isMounted) return;
            if (token == null || token.length < 10) {
                props.navigation.navigate('Login');
                return;
            } else {
                me().then(user => {
                    setUser(user);
                }).catch(() => {
                    props.navigation.navigate('Login');
                })
            }
        })
        return () => {
            isMounted = false;
        };
    }, []);
    useEffect(() => {
        if (user == null) {
            return;
        }
        let isMounted = true;
        getTasks().then(tasks => {
            if (isMounted)
                setTasks(tasks);
        }).catch(error => console.log(error));
        getTaskTimes().then(times => {
            if (isMounted)
                setTaskTimes(times);
        }).catch(error => console.log(error));
        return () => {
            isMounted = false;
        };
    }, [user]);
    useEffect(() => {
        let isMounted = true;
        getWallBindings().then(bindings => {
            if (isMounted)
                setBindings(bindings ?? {});
        });
        return () => {
            isMounted = false;
        };
    });
    const logout = useCallback(() => {
        clearToken();
        props.navigation.navigate('Login');
    }, [])
    let [characteristic, setCharacteristic] = useState<Characteristic | null>(null);
    let [wall, setWall] = useState<number>(-1);
    React.useEffect(() => {
        if (characteristic !== null) return;
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
        if (characteristic === null) {
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
        if (lastWall !== wall) {
            setWallChangeTime(Date.now());
            setLastWall(wall);
            setElapsedTime(0);
            if (wall >= 1 && wall <= 8 && bindings[wall]) {
                saveTaskTime(bindings[wall]).then(time => {
                    getTaskTimes().then(times => {
                        setTaskTimes(times);
                    });
                }).catch(e => {
                });
            } else {
                saveTaskTime().then(d => {
                }).catch(e => {
                    getTaskTimes().then(times => {
                        setTaskTimes(times);
                    });
                });
            }
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
        if (num < 60) {
            return Math.round(num) + "s";
        }
        return Math.round(num / 60) + "min " + Math.round(num) % 60 + "s";
    }

    const getTask = useCallback(taskID => {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i]._id == taskID) {
                return tasks[i];
            }
        }
        return null;
    }, [tasks]);

    const [timeTableMode, setTimeTableMode] = useState('day');

    if (user == null) {
        return <View style={styles.container}>
            <ActivityIndicator/>
        </View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={{padding: 10, backgroundColor: '#444', display: 'flex', flexDirection: 'row'}}>
                <Text style={{color: '#fff', flexGrow: 1}}>Zalogowano jako: {user.name}</Text>
                <Pressable onPress={logout}><Text
                    style={{textDecorationLine: 'underline', color: '#fff'}}>Wyloguj</Text></Pressable>
            </View>
            <View>
                {wall !== -1 ? (
                    <View style={{
                        padding: 10,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <View>
                            <Text style={{color: '#fff', fontSize: 18}}>Aktualne zadanie: </Text>
                            {bindings[wall] ? (
                                <Text style={{
                                    color: '#fff',
                                    fontSize: 18
                                }}>{getTask(bindings[wall])?.name} ({formatElapsedtime(elapsedTime)})</Text>
                            ) : (
                                <Text style={{color: '#fff', fontSize: 18}}>Brak
                                    ({formatElapsedtime(elapsedTime)})</Text>
                            )}
                        </View>
                        <Pressable onPress={() => props.navigation.navigate('ChangeWallBinding', {wall})}>
                            <Text style={{textDecorationLine: 'underline', color: '#fff'}}>
                                Zmień zadanie
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={{padding: 10, display: 'flex', flexDirection: 'row'}}>
                        <Text style={{color: '#fff'}}>Brak połączenia z kostką</Text>
                    </View>
                )}
            </View>
            <View>
                <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-around'}}>
                    {[['day', 'Dziś'], ['week', 'Ten tydzień'], ['month', 'Ten miesiąc'], ['year', 'Ten rok']].map(el => (
                        <Pressable onPress={() => setTimeTableMode(el[0])}>
                            <Text style={{fontSize: 17, textDecorationLine: timeTableMode === el[0] ? 'none' : 'underline', color: timeTableMode !== el[0]? '#ccc': '#fff'}}>{el[1]}</Text>
                        </Pressable>
                    ))}
                </View>
                <View>
                    <Text style={{color: '#fff'}}>Statystyki z {timeTableMode}</Text>
                </View>
                <StatusBar style="light"/>
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
