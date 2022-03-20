import {AsyncStorage} from 'react-native';

export const setToken = async (token: string) => {
    try {
        await AsyncStorage.setItem('accessToken',token);
    } catch (error) {
        console.error(error);
    }
};
export const getToken = async (): Promise<string | null> => {
    try {
        return (await AsyncStorage.getItem('accessToken')) ?? "";
    } catch (error) {
        console.error(error);
    }
    return null;
};
export const setRefreshToken = async (token: string) => {
    try {
        await AsyncStorage.setItem('refreshToken',token);
    } catch (error) {
        console.error(error);
    }
};
export const getRefreshToken = async (): Promise<string | null>  => {
    try {
        return await AsyncStorage.getItem('refreshToken');
    } catch (error) {
        console.error(error);
    }
    return null;
};