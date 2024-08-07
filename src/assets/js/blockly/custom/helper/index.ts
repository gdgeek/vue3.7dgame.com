import Type from './type'
import * as Blockly from 'blockly';
import SleepEntity from './sleep'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string;
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
