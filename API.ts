import axios from 'axios';
import { getToken, setRefreshToken, setToken } from './Storage';
import { User } from './types';
const baseUrl = 'http://130.162.43.223:3000';

export const login = (name: string, password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/login`, {name, password}).then((response) => {
            if(response.data.success){
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            }else{
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
            if(response.data.success){
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            }else{
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
            if(response.data.success){
                setToken(response.data.accessToken);
                setRefreshToken(response.data.refreshToken);
                resolve(response.data.accessToken);
            }else{
                reject(response.data.error);
            }
        });
    })
}

export const me = async (): Promise<User> => {
    const token = await getToken();
    return new Promise((resolve, reject) => {
        axios.post(`${baseUrl}/me`, {token}).then((response) => {
            if(response.data.success){
                resolve(response.data.user as User);
            }else{
                reject(response.data.error);
            }
        });
    })
}