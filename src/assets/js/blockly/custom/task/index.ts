import Type from './type'
import * as Blockly from 'blockly';
import TweenTask from './tween'
import Slee from './tween'
import TaskArray from './task_array'
import TaskCricle from './task_circle'
import RunTask from './run_task'
import SleepTask from './sleep_task'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string | [string, number];
}

const TaskCategory = {
  kind: 'category',
  name: '任务',
  colour: Type.colour,
  contents: [
    TweenTask.toolbox,
    TaskArray.toolbox,
    TaskCricle.toolbox,
    RunTask.toolbox,
    SleepTask.toolbox
  ]
}

function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function TaskRegister(parameters: any) {
  RegisterData(TweenTask, parameters)
  RegisterData(TaskArray, parameters)
  RegisterData(TaskCricle, parameters)
  RegisterData(RunTask, parameters)
  RegisterData(SleepTask, parameters)
}
export {
  TaskCategory,
  TaskRegister
}
