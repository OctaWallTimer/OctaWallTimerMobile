import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createSwitchNavigator, createAppContainer } from "react-navigation";
import HomeScreen from './pages/HomeScreen';
import LoginScreen from './pages/LoginScreen';
import RegisterScreen from './pages/RegisterScreen';
import ChangeWallBindingScreen from './pages/ChangeWallBindingScreen';



export default function App() {

  return (
    <AppContainer/>
  );
}


const AppNavigator = createSwitchNavigator({
  Home: {
    screen: HomeScreen
  },
  Login: {
    screen: LoginScreen
  },
  Register: {
    screen: RegisterScreen
  },
  ChangeWallBinding: {
    screen: ChangeWallBindingScreen
  }
},{
  initialRouteName: "Home"
});

const AppContainer = createAppContainer(AppNavigator);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
