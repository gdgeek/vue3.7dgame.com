import Type from './type'
import Blockly from 'blockly'
import TweenTask from './tween.js'
import Slee from './tween.js'
import TaskArray from './task_array'
import TaskCricle from './task_circle'
import RunTask from './run_task'
import SleepTask from './sleep_task'
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

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function TaskRegister(parameters) {
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
