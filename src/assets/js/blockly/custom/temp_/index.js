import Type from './type'
import Blockly from 'blockly'

//import Event from './event.js'
//import OutEvent from './out_event.js'
//import EventWithParameter from './event-with-parameter.js'
//import Task from './task.js'
//import TaskArray from './task_array.js'
//import TaskCricle from './task_circle.js'
//import LoadLevel from './load_level.js'
//import UnloadLevel from './unload_level.js'
//import Anchor from './anchor.js'
//import Rectangle from './rectangle.js'
//import NumberParameter from './number_parameter.js'
//import BooleanParameter from './boolean_parameter.js'
//import StringParameter from './string_parameter.js'
//import Execute from './execute.js'
//import Parameters from './parameters.js'
//import SystemTask from './system_task.js'
//import SystemParameter from './system_parameter.js'
//import Player from './player.js'

const VerseCategory = {
  kind: 'category',
  name: '宇宙',
  colour: Type.colour,
  contents: [
    //LoadLevel.toolbox,
    //UnloadLevel.toolbox,
    // Event.toolbox,
    //OutEvent.toolbox,

    //EventWithParameter.toolbox,
    //Start.toolbox,
    //Sleep.toolbox,
    //Anchor.toolbox,
    // NumberParameter.toolbox,
    //BooleanParameter.toolbox,
    //StringParameter.toolbox,
    // Rectangle.toolbox,
    // Task.toolbox,
    //TaskCricle.toolbox,
    //TaskArray.toolbox,
    // Execute.toolbox,
    //Parameters.toolbox,
    // SystemTask.toolbox,
    //SystemParameter.toolbox,
    // Player.toolbox
  ]
}

function RegisterData(data, parameters) {
  // Blockly.Blocks[data.title] = data.getBlock(parameters)
  // Blockly.Lua[data.title] = data.getLua(parameters)
}
function VerseRegister(parameters) {
  //RegisterData(LoadLevel, parameters)
  //RegisterData(UnloadLevel, parameters)
  //RegisterData(Rectangle, parameters)
  //RegisterData(Task, parameters)
  //RegisterData(Execute, parameters)
  //RegisterData(SystemTask, parameters)
  //RegisterData(Player, parameters)
}
export { VerseCategory, VerseRegister }
