import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {StatusBar} from 'expo-status-bar';
import React, {useCallback, useEffect, useState} from 'react';
import {Button, Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {getTasks, login, me, saveTask} from '../API';
import {getToken, getWallBindings, setToken, setWallBindings} from '../Storage';
import {RootStackParamList, Task, User} from '../types';
import {FontAwesomeIcon} from '@fortawesome/react-native-fontawesome'
import {IconName} from "@fortawesome/fontawesome-common-types";

type Props = NativeStackScreenProps<RootStackParamList, 'ChangeWallBinding'>;

const icons = [
    "bath",
    "beer-mug-empty",
    "bomb",
    "book-journal-whills",
    "broom-ball",
    "brush",
    "business-time",
    "camera-retro",
    "code",
    "dragon",
    "dumpster-fire",
    "fire",
    "floppy-disk",
    "font-awesome",
    "ghost",
    "golf-ball-tee",
    "guitar",
    "hand-spock",
    "ice-cream",
    "jedi",
    "meteor",
    "motorcycle",
    "mug-saucer",
    "poo",
    "poo-storm",
    "record-vinyl",
    "socks",
    "stroopwafel",
    "umbrella-beach",
    "user-astronaut",
    "user-secret",
    "virus",
    "whiskey-glass",
]

export default function ChangeWallBindingScreen(props: Props) {
    const wall = props.navigation.state.params.wall;
    const [name, setName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(icons[0]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [user, setUser] = useState<User | null>(null);
    const [tasks, setTasks] = useState<Task[]>([]);
    useEffect(() => {
        getToken().then(token => {
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
    }, []);
    useEffect(() => {
        if (user == null) {
            return;
        }
        getTasks().then(tasks => {
            setTasks(tasks);
        }).catch(error => console.log(error));
    }, [user]);

    const setTask = useCallback((taskID) => {
        getWallBindings().then(bindings => {
            if (!bindings) {
                bindings = {};
            }
            let keys: string[] = Object.keys(bindings);
            for (let i = 0; i < keys.length; i++) {
                if (bindings[parseInt(keys[i])] == taskID) {
                    delete bindings[parseInt(keys[i])];
                }
            }
            bindings[wall] = taskID;
            setWallBindings(bindings);
            setLoading(false);
            props.navigation.goBack()
        })
    }, [wall]);
    const onSave = useCallback(() => {
        setLoading(true);
        saveTask(name, "ff0000", selectedIcon).then(task => {
            setTask(task._id);
        }).catch(error => {
            setLoading(false);
            setError(error);
        });
    }, [name]);
    const exit = useCallback(() => {
        props.navigation.goBack()
    }, [name]);
    return (
        <View style={styles.container}>
            <Text style={{fontSize: 25, marginBottom: 10, color: '#fff'}}>Numer aktualnej ścianki: {wall}</Text>
            <Text style={{fontSize: 20, marginBottom: 10, color: '#fff'}}>Wybierz zadanie lub przypisz nowe</Text>
            <View style={{width: '100%'}}>
                <Text style={{fontSize: 20, marginBottom: 10, color: '#fff'}}>Aktualne zadania:</Text>
                {tasks.length == 0 ? (
                    <Text style={{color: '#fff'}}>Brak zadań</Text>
                ) : tasks.map(task => (
                    <Pressable onPress={() => setTask(task._id)} style={{
                        backgroundColor: '#444',
                        paddingHorizontal: 20,
                        paddingVertical: 5,
                        marginVertical: 10,
                        borderRadius: 8,
                        display: 'flex',
                        flexDirection: 'row'
                    }} key={task._id}>
                        <FontAwesomeIcon icon={['fas', task.icon as IconName]}
                                         style={{color: '#fff', marginRight: 10}}/>
                        <Text style={{color: '#fff', flexGrow: 1}}>{task.name}</Text>
                        <Pressable onPress={() => {
                            console.log("edit")
                        }}>
                            <FontAwesomeIcon icon={['fas', 'pen']} style={{color: '#fff', marginRight: 10}}/>
                        </Pressable>
                    </Pressable>
                ))}
            </View>
            <Text style={{color: '#ff3020', marginBottom: 10}}>{error}</Text>
            <View style={{marginBottom: 10}}>
                <Text style={{color: '#fff'}}>Nowa nazwa</Text>
                <TextInput style={styles.input} onChangeText={text => setName(text)} value={name} editable={!loading}/>
            </View>
            <View style={{display: 'flex', flexDirection: 'row', flexWrap: 'wrap'}}>
                {icons.map((icon) => (
                    <Pressable style={selectedIcon == icon ? {borderWidth: 1, borderColor: '#ffffff', borderRadius: 5, backgroundColor: '#ffffff80'} : {}} onPress={() => setSelectedIcon(icon)}>
                        <FontAwesomeIcon icon={['fas', icon as IconName]} style={{color: '#fff', margin: 5}} size={25}/>
                    </Pressable>
                ))}
            </View>
            <Pressable onPress={onSave} style={{
                backgroundColor: '#ff5010',
                paddingHorizontal: 20,
                paddingVertical: 5,
                marginVertical: 10,
                borderRadius: 8
            }}>
                <Text style={{color: '#fff'}}>Zapisz</Text>
            </Pressable>
            <Pressable onPress={exit} style={{
                backgroundColor: '#666',
                paddingHorizontal: 20,
                paddingVertical: 5,
                marginVertical: 10,
                borderRadius: 8
            }}>
                <Text style={{color: '#fff'}}>Anuluj</Text>
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
