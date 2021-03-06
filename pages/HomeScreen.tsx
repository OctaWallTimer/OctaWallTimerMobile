import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Dimensions, Pressable, ScrollView, Share, StyleSheet, Text, View} from 'react-native';
import base64 from 'react-native-base64'
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {VictoryAxis, VictoryBar, VictoryChart, VictoryStack, VictoryTheme} from "victory-native";


import {CHARACTERISTIC_UUID, manager, SERVICE_UUID} from '../BLE';
import {Characteristic} from 'react-native-ble-plx';
import {clearToken, getToken, getWallBindings} from '../Storage';
import {ChartTimeTable, RootStackParamList, Task, TimeTable, User} from '../types';
import {getTasks, getTimeTable, me, saveTaskTime, share} from '../API';
import {SafeAreaView} from 'react-navigation';
import {IconName} from "@fortawesome/fontawesome-common-types";
import {FontAwesomeIcon} from "@fortawesome/react-native-fontawesome";
import {FloatingAction} from "react-native-floating-action";

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type DisplayModeType = "CHART" | "TABLE";
const pad: (a: number) => string = d => d.toString().padStart(2, '0');

export default function HomeScreen(props: Props) {
    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [bindings, setBindings] = useState<{ [id: number]: string }>({});
    const [displayMode, setDisplayMode] = useState<DisplayModeType>("CHART");
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
    const logout = useCallback(async () => {
        await clearToken();
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
                        device.onDisconnected(() => {
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
        let elapsed = "";
        num = Math.floor(num / 1000);

        let sec = num % 60;
        num = Math.floor(num / 60);

        let min = num % 60;
        num = Math.floor(num / 60);

        let hours = num % 24;
        num = Math.floor(num / 24);

        let days = num;

        if (days > 0) elapsed += days + "d ";
        if (hours > 0) elapsed += hours + "h ";
        if (min > 0) elapsed += min + "min ";
        if (sec > 0) elapsed += sec + "s ";
        if (elapsed.length == 0) elapsed = "0s";

        if (short) {
            return elapsed.split(" ")[0];
        }
        return elapsed;
    }

    const getTask = useCallback(taskID => {
        for (let i = 0; i < tasks.length; i++) {
            if (tasks[i]._id == taskID) {
                return tasks[i];
            }
        }
        return null;
    }, [tasks]);

    const [timeTableMode, setTimeTableMode] = useState<'day' | 'week' | 'month' | 'year'>('day');
    const [timeTable, setTimeTable] = useState<TimeTable[]>([]);
    const [timeTableOffset, setTimeTableOffset] = useState(0);
    const timeTableOffsetTitle = useMemo(() => {
        let now = (new Date()).getTime();
        const day = 24 * 60 * 60 * 1000;
        switch (timeTableMode) {
            case 'day': {
                const date = new Date(now - day * timeTableOffset);
                return pad(date.getDate()) + "." + pad(date.getMonth() + 1) + "." + date.getFullYear();
            }
            case 'week': {
                const end = new Date(now - 7 * day * timeTableOffset);
                const start = new Date(now - 7 * day * (timeTableOffset + 1));
                return pad(start.getDate()) + "." + pad(start.getMonth() + 1) + "." + start.getFullYear() + " - "
                    + pad(end.getDate()) + "." + pad(end.getMonth() + 1) + "." + end.getFullYear();
            }
            case 'month': {
                const end = new Date(now);
                end.setMonth(end.getMonth() - timeTableOffset);
                return pad(end.getMonth() + 1) + "/" + end.getFullYear();
            }
            case 'year': {
                const end = new Date(now);
                end.setFullYear(end.getFullYear() - timeTableOffset);
                return end.getFullYear().toString();
            }
        }
        return ""
    }, [timeTableOffset, timeTableMode]);
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
                            day: ["Nd", "Pon", "Wt", "??r", "Czw", "Pt", "Sb"][start.getDay()],
                            time: timeTable[day].tasks[task._id] ?? 0
                        })
                    }
                    break;
                case 'month':
                    for (let week = 0; week < timeTable.length; week++) {
                        const start = new Date(timeTable[week].start);
                        const end = new Date(timeTable[week].end);
                        data.push({
                            day: `${pad(start.getDate())}.${pad(start.getMonth())}`,
                            time: timeTable[week].tasks[task._id] ?? 0
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
    }, [tasks, timeTable]);
    useEffect(() => {
        let isMounted = true;
        getTimeTable(timeTableMode, timeTableOffset).then(timeTable => {
            if (isMounted)
                setTimeTable(timeTable ?? []);
        });
        return () => {
            isMounted = false;
        };
    }, [setTimeTable, timeTableMode, timeTableOffset]);

    const [selectedChartLabel, setSelectedChartLabel] = useState("");

    const onShare = useCallback(() => {
        share(timeTableMode, timeTableOffset).then(link => {
            Share.share({
                url: link,
            })
        }).catch(error => {
        });
    }, [timeTableMode, timeTableOffset])

    if (user == null) {
        return <View style={styles.container}>
            <ActivityIndicator/>
        </View>;
    }

    const chartColors = ["#ff0000", "#ff8700", "#ffd300", "#deff0a", "#a1ff0a", "#0aff99", "#0aefff", "#147df5", "#580aff", "#be0aff"];

    const chartWidth = Dimensions.get('window').width;
    const chartLeftPadding = 60;
    const chartRightPadding = 20;
    const chartTheme = VictoryTheme.material;
    if (!chartTheme.axis) chartTheme.axis = {};
    if (!chartTheme.axis.style) chartTheme.axis.style = {};
    if (!chartTheme.axis.style.tickLabels) chartTheme.axis.style.tickLabels = {};
    if (!chartTheme.axis.style.axis) chartTheme.axis.style.axis = {};
    chartTheme.axis.style.tickLabels.fill = '#fff';

    // @ts-ignore
    return (
        <SafeAreaView style={styles.container}>
            <ScrollView>
                <View style={{padding: 10, backgroundColor: '#444', display: 'flex', flexDirection: 'row'}}>
                    <Text style={{color: '#fff', flexGrow: 1}}>Zalogowano jako: {user.name}</Text>
                    <Pressable onPress={logout}><Text
                        style={{textDecorationLine: 'underline', color: '#fff'}}>Wyloguj</Text></Pressable>
                </View>
                <View>
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
                                }}>{getTask(bindings[wall])?.name} ({formatElapsedtime(elapsedTime).trimEnd()})</Text>
                            ) : (
                                <Text style={{color: '#fff', fontSize: 18}}>Brak</Text>
                            )}
                        </View>
                        {characteristic !== null &&
                            <Pressable onPress={() => props.navigation.navigate('ChangeWallBinding', {wall})}>
                                <Text style={{textDecorationLine: 'underline', color: '#fff'}}>
                                    Zmie?? zadanie
                                </Text>
                            </Pressable>
                        }
                    </View>
                </View>
                <View>
                    <View style={{backgroundColor: "#333", display: "flex", flexDirection: "row", marginBottom: 10}}>
                        <Pressable onPress={() => {
                            setDisplayMode("CHART")
                        }} style={{
                            flex: 1,
                            backgroundColor: displayMode == "CHART" ? "#555" : "transparent",
                            alignItems: "center",
                            padding: 10
                        }}>
                            <Text style={{fontSize: 17, color: "#fff"}}>Wykres</Text>
                        </Pressable>
                        <Pressable onPress={() => {
                            setDisplayMode("TABLE")
                        }} style={{
                            flex: 1,
                            backgroundColor: displayMode == "TABLE" ? "#555" : "transparent",
                            alignItems: "center",
                            padding: 10
                        }}>
                            <Text style={{fontSize: 17, color: "#fff"}}>Tabela</Text>
                        </Pressable>

                    </View>
                    <View style={{display: 'flex', flexDirection: "row", justifyContent: 'space-around'}}>
                        {[['day', 'Dzi??'], ['week', 'Ten tydzie??'], ['month', 'Ten miesi??c'], ['year', 'Ten rok']].map(el => (
                            <Pressable onPress={() => {
                                setTimeTableMode(el[0]);
                                setTimeTableOffset(0);
                            }} key={el[0]}>
                                <Text style={{
                                    fontSize: 17,
                                    textDecorationLine: timeTableMode === el[0] ? 'none' : 'underline',
                                    color: timeTableMode !== el[0] ? '#ccc' : '#fff'
                                }}>{el[1]}</Text>
                            </Pressable>
                        ))}
                    </View>
                    <View style={{
                        display: 'flex',
                        marginTop: 20,
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center'
                    }}>
                        <Text style={{flex: 1}}/>
                        <Pressable onPress={() => setTimeTableOffset(timeTableOffset + 1)}>
                            <FontAwesomeIcon icon={['fas', 'arrow-left']} color={'#fff'}/>
                        </Pressable>
                        <Text style={{
                            color: '#fff',
                            fontSize: 20,
                            marginLeft: 10,
                            marginRight: 10
                        }}>{timeTableOffsetTitle}</Text>
                        <Pressable onPress={() => setTimeTableOffset(timeTableOffset - 1)} style={{flex: 1}}>
                            <FontAwesomeIcon icon={['fas', 'arrow-right']} color={'#fff'}/>
                        </Pressable>
                        <Pressable onPress={onShare} style={{paddingRight: 15}}>
                            <FontAwesomeIcon icon={['fas', 'share']} color={'#fff'}/>
                        </Pressable>
                    </View>
                    {displayMode == "CHART" && <View>
                        {chartData.length > 0 &&
                            <View>

                                <VictoryChart
                                    domainPadding={0}
                                    height={330}
                                    width={chartWidth}
                                    padding={{left: chartLeftPadding, top: 20, right: chartRightPadding, bottom: 40}}
                                    theme={chartTheme}
                                >
                                    <VictoryAxis
                                        tickValues={chartData[0].data.map((cd, i) => i)}
                                        tickFormat={chartData[0].data.map((cd) => cd.day)}
                                        offsetY={39}
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
                                                (<VictoryBar
                                                    barWidth={(chartWidth - chartLeftPadding - chartRightPadding) / cd.data.length}
                                                    style={{
                                                        data: {
                                                            fill: chartColors[i % chartColors.length],
                                                            stroke: '#000',
                                                            strokeWidth: 2
                                                        }
                                                    }}
                                                    key={cd.name}
                                                    data={selectedChartLabel === "" || selectedChartLabel === cd.name ? cd.data : [{
                                                        day: '',
                                                        time: 0
                                                    }]}
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
                                                {tasks.find(t => t.name == cd.name) !== undefined && <FontAwesomeIcon
                                                    icon={['fas', (tasks.find(t => t.name == cd.name) ?? {icon: ''}).icon as IconName]}
                                                    style={{
                                                        color: selectedChartLabel == "" || selectedChartLabel == cd.name ? chartColors[i % chartColors.length] : '#444'
                                                    }}/>}
                                                {cd.name}
                                            </Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>
                        }
                    </View>}
                    {displayMode == "TABLE" && <>
                        <Text style={{
                            color: '#fff',
                            textAlign: 'center',
                            fontSize: 25,
                            marginTop: 20,
                            marginBottom: 10
                        }}>Podsumowanie:</Text>
                        <View>
                            {chartData.map((cd, i) => (
                                <View key={i} style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    borderTopWidth: i > 0 ? 1 : 0,
                                    borderTopColor: '#aaa',
                                    paddingTop: 10,
                                    paddingBottom: 10,
                                }}>
                                    <View style={{
                                        flexBasis: '50%',
                                        marginRight: 10,
                                        display: "flex",
                                        flexDirection: "row",
                                        justifyContent: "flex-end"
                                    }}>
                                        <FontAwesomeIcon
                                            icon={['fas', (tasks.find(t => t.name == cd.name) ?? {icon: ''}).icon as IconName]}
                                            style={{
                                                marginRight: 5,
                                                color: selectedChartLabel == "" || selectedChartLabel == cd.name ? chartColors[i % chartColors.length] : '#444'
                                            }}/>
                                        <Text style={{color: '#fff'}}>
                                            {cd.name}
                                        </Text>
                                    </View>
                                    <Text style={{
                                        color: '#fff',
                                        flexBasis: '50%',
                                        paddingLeft: 10
                                    }}>{formatElapsedtime(cd.data.reduce((a, b) => a + b.time, 0))}</Text>
                                </View>
                            ))}
                        </View>
                    </>}

                    <StatusBar style="light"/>
                </View>
            </ScrollView>
            {characteristic === null && <FloatingAction
                actions={Object.keys(bindings)
                    .filter((wall: number) => bindings[wall] && getTask(bindings[wall]) != null)
                    .map((wall: number) => {
                        let task = getTask(bindings[wall]);

                        return {
                            text: task?.name,
                            color: '#fff',
                            icon: <FontAwesomeIcon icon={['fas', task?.icon]}/>,
                            name: wall
                        };
                    })}
                onPressItem={wall => setWall(wall)}
                floatingIcon={<FontAwesomeIcon icon={['fas', wall === -1 ? 'play' : 'close']}/>}
                color={wall === -1 ? "#00ff00" : "#555555"}
                onPressMain={() => {
                    if (wall !== -1) {
                        setWall(-1);
                    }
                }}
            />}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#222',
        height: '100%',
    },
});
