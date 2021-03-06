export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  ChangeWallBinding: { wall: number };
};

export type User = {
  name: string;
}

export interface Task {
  _id: string;
  name: string;
  color: string;
  icon: string;
}
export interface TaskTime {
  _id: string;
  user: string;
  task: string;
  start: Date;
  end: Date;
}

export interface TimeTable{
  start: number;
  end: number;
  tasks: {
    [task: string]: number;
  }
}

export type ChartTimeTable = {
  day: string;
  time: number;
}
