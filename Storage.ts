import {AsyncStorage} from 'react-native';

export const setToken = async (token: string) => {
    try {
        await AsyncStorage.setItem('accessToken',token);
    } catch (error) {
        console.error(error);
    }
};
export const clearToken = async () => {
    try {
        await AsyncStorage.removeItem('accessToken');
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
export const setWallBindings = async (bindings: {[id: number] : string}) => {
    try {
        await AsyncStorage.setItem('bindings',JSON.stringify(bindings));
    } catch (error) {
        console.error(error);
    }
};
export const getWallBindings = async (): Promise<{[id: number] : string} | null>  => {
    try {
        return JSON.parse(await AsyncStorage.getItem('bindings') ?? "{}");
    } catch (error) {
        console.error(error);
    }
    return null;
};
