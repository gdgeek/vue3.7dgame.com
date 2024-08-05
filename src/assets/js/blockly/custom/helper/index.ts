import Type from './type'
import * as Blockly from 'blockly';
import SleepEntity from './sleep'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => string;
}


const HelperCategory = {
  kind: 'category',
  name: '其他',
  colour: Type.colour,
  contents: [SleepEntity.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function HelperRegister(parameters: any) {
  RegisterData(SleepEntity, parameters)
}
export { HelperCategory, HelperRegister }
