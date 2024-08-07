import Type from './type'
import * as Blockly from 'blockly';
import BoomExecute from './boom_execute'
import FunctionExecute from './function_execute'
//import LineExecute from './line_execute'
//import TweenExecute from './tween_execute'
//import VisualExecute from './visual_execute'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string;
}

const ExecuteCategory = {
  kind: 'category',
  name: '可执行',
  colour: Type.colour,
  contents: [BoomExecute.toolbox, FunctionExecute.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function ExecuteRegister(parameters: any) {
  RegisterData(BoomExecute, parameters)
  RegisterData(FunctionExecute, parameters)
}
export { ExecuteCategory, ExecuteRegister }
