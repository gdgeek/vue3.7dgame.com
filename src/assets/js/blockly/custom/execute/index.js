import Type from './type'
import Blockly from 'blockly'
import BoomExecute from './boom_execute'
import FunctionExecute from './function_execute'
//import LineExecute from './line_execute'
//import TweenExecute from './tween_execute'
//import VisualExecute from './visual_execute'

const ExecuteCategory = {
  kind: 'category',
  name: '可执行',
  colour: Type.colour,
  contents: [BoomExecute.toolbox, FunctionExecute.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function ExecuteRegister(parameters) {
  RegisterData(BoomExecute, parameters)
  RegisterData(FunctionExecute, parameters)
}
export { ExecuteCategory, ExecuteRegister }
