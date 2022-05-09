import axios from 'axios';
import {getToken, setRefreshToken, setToken} from './Storage';
import {Task, TaskTime, TimeTable, User} from './types';

const baseUrl = 'http://130.162.43.223:3000';

export const login = (name: string, password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/login`, {name, password}).then((response) => {
            if (response.data.success) {
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem");
        });
    })
}

export const register = (name: string, password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/register`, {name, password}).then((response) => {
            if (response.data.success) {
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem");
        });
    })
}

export const refresh = (token: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/refresh`, {token}).then((response) => {
            if (response.data.success) {
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem");
        });
    })
}

export const me = async (): Promise<User> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/me`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.user as User);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem");
        });
    })
}

export const getTasks = async (): Promise<Task[]> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}/tasks`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.tasks as Task[]);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}

export const saveTask = async (name: string, color: string, icon: string): Promise<Task> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/tasks`, {name, color, icon}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.task as Task);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}

export const updateTask = async (taskID: string, name: string, color: string, icon: string): Promise<Task> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/tasks/${taskID}`, {name, color, icon}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.task as Task);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}

export const getTaskTimes = async (): Promise<TaskTime[]> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}/time`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.time as TaskTime[]);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}

export const saveTaskTime = async (task?: string): Promise<TaskTime> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/time`, task !== undefined ? {task} : null, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.time as TaskTime);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}

export const getTimeTable = async (mode?: string, offset?: number): Promise<TimeTable[]> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.get(`${baseUrl}/timetable?mode=${mode}&offset=${offset}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then((response) => {
            if (response.data.success) {
                resolve(response.data.data as TimeTable[]);
            } else {
                reject(response.data.error);
            }
        }).catch(error => {
            reject("Błąd komunikacji z serwerem, " + error);
        });
    })
}
