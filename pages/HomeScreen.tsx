import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import base64 from 'react-native-base64'
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
    VictoryArea,
    VictoryAxis,
    VictoryBar,
    VictoryChart,
    VictoryGroup, VictoryLegend,
    VictoryStack,
    VictoryTheme
} from "victory-native";


import {manager, SERVICE_UUID, CHARACTERISTIC_UUID} from '../BLE';
import {Characteristic} from 'react-native-ble-plx';
import {clearToken, getToken, getWallBindings, setToken} from '../Storage';
import {ChartTimeTable, RootStackParamList, Task, TaskTime, TimeTable, User} from '../types';
import {getTasks, getTaskTimes, getTimeTable, me, saveTaskTime} from '../API';
import {SafeAreaView} from 'react-navigation';
import {IconName} from "@fortawesome/fontawesome-common-types";
import {FontAwesomeIcon} from "@fortawesome/react-native-fontawesome";

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen(props: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
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
    }, []);
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
                    //todo: refresh timetable
                }).catch(e => {
                });
            } else {
                saveTaskTime().then(d => {
                }).catch(e => {
                    //todo: refresh timetable
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

    const formatElapsedtime = (num: number, short: boolean = false) => {
        num /= 1000;
        if (num < 60) {
            return Math.round(num) + "s";
        }
        if (short) {
            return Math.round(num / 60) + "min";
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
    const [timeTable, setTimeTable] = useState<TimeTable[]>([]);
    const chartData = useMemo(() => {
        let ret: { name: string, data: ChartTimeTable[] }[] = [];
        for (let taskId = 0; taskId < tasks.length; taskId++) {
            const task = tasks[taskId];
            let data = [];
            switch (timeTableMode) {
                case 'day':
                    for (let hour = 0; hour < 23; hour++) {
                        data.push({
                            day: `${hour < 10 ? '0' + hour : hour}:00:00`,
                            time: timeTable[hour].tasks[task._id] ?? 0
                        })
                    }
                    break;
                case 'week':
                    for (let day = 0; day < 7; day++) {
                        const start = new Date();
                        start.setDate(start.getDate() - 6 + day);
                        data.push({
                            day: ["Nd", "Pon", "Wt", "Śr", "Czw", "Pt", "Sb"][start.getDay()],
                            time: timeTable[day].tasks[task._id] ?? 0
                        })
                    }
                    break;
                case 'month':
                    for (let day = 0; day < 31; day++) {
                        const start = new Date();
                        start.setDate(start.getDate() - 30 + day);
                        start.setHours(0, 0, 0, 0);
                        data.push({
                            day: `${day}`,
                            time: timeTable[day].tasks[task._id] ?? 0
                        })
                    }
                    break;
                case 'year':
                    for (let month = 0; month < 12; month++) {
                        const start = new Date();
                        start.setMonth(month, 1)
                        start.setHours(0, 0, 0, 0);
                        data.push({
                            day: `${month}`,
                            time: timeTable[month].tasks[task._id] ?? 0
                        })
                    }
                    break;
            }
            ret.push({
                name: task.name,
                data
            })
        }
        return ret;
    }, [timeTable]);
    useEffect(() => {
        let isMounted = true;
        getTimeTable(timeTableMode).then(timeTable => {
            if (isMounted)
                setTimeTable(timeTable ?? []);
        });
        return () => {
            isMounted = false;
        };
    }, [timeTableMode]);

    const [selectedChartLabel, setSelectedChartLabel] = useState("");

    if (user == null) {
        return <View style={styles.container}>
            <ActivityIndicator/>
        </View>;
    }

    const chartColors = ["#ff0000", "#ff8700", "#ffd300", "#deff0a", "#a1ff0a", "#0aff99", "#0aefff", "#147df5", "#580aff", "#be0aff"];

    // @ts-ignore
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
                        <Pressable onPress={() => setTimeTableMode(el[0])} key={el[0]}>
                            <Text style={{
                                fontSize: 17,
                                textDecorationLine: timeTableMode === el[0] ? 'none' : 'underline',
                                color: timeTableMode !== el[0] ? '#ccc' : '#fff'
                            }}>{el[1]}</Text>
                        </Pressable>
                    ))}
                </View>
                <View>
                    {chartData.length > 0 &&
                    <View>

                        <VictoryChart
                            domainPadding={0}
                            height={330}
                            padding={{left: 70, top: 20, right: 20, bottom: 40}}
                            theme={VictoryTheme.material}
                        >
                            <VictoryAxis
                                tickValues={chartData[0].data.map((cd, i) => i)}
                                tickFormat={chartData[0].data.map((cd, i) => cd.day)}
                                fixLabelOverlap={true}
                            />
                            <VictoryAxis
                                dependentAxis
                                tickFormat={(x) => formatElapsedtime(x, true)}
                                fixLabelOverlap={true}
                            />
                            <VictoryStack>
                                {chartData.map((cd, i) => {
                                    return cd.data.length > 0 &&
                                        (<VictoryArea
                                            style={{data: {fill: chartColors[i % chartColors.length]}}}
                                            key={cd.name}
                                            data={selectedChartLabel === "" || selectedChartLabel === cd.name ? cd.data : [{day: '', time: 0}]}
                                            x="day"
                                            y="time"
                                        />);
                                })}
                            </VictoryStack>
                        </VictoryChart>
                        <View style={{paddingLeft: 20, paddingRight: 20}}>
                            {chartData.map((cd, i) => (
                                <Pressable
                                    key={i}
                                    onPress={() => setSelectedChartLabel(selectedChartLabel == cd.name ? "" : cd.name)}>
                                    <Text style={{
                                        color: selectedChartLabel == "" || selectedChartLabel == cd.name ? '#fff' : '#444',
                                        fontSize: 20
                                    }}>
                                        <Text style={{
                                            color: selectedChartLabel == "" || selectedChartLabel == cd.name ? chartColors[i % chartColors.length] : '#444',
                                            fontSize: 25
                                        }}>●</Text>
                                        {tasks.find(t => t.name == cd.name) !== undefined && <FontAwesomeIcon
                                            icon={['fas', (tasks.find(t => t.name == cd.name) ?? {icon: ''}).icon as IconName]}
                                            style={{color: selectedChartLabel == "" || selectedChartLabel == cd.name ? '#fff' : '#444'}}/>}
                                        {cd.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                    }
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
