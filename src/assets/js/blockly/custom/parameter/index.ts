import Type from './type'
import * as Blockly from 'blockly';
import BooleanParameter from './boolean_parameter'
import NumberParameter from './number_parameter'
import StringParameter from './string_parameter'
import Parameters from './parameters'
import SystemParameter from './system_parameter'
import PlayerParameter from './player_parameter'
import RectangleParameter from './rectangle_parameter'
import PointParameter from './point_parameter'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => [string, number];
}

const ParameterCategory = {
  kind: 'category',
  name: '参数',
  colour: Type.colour,
  contents: [
    BooleanParameter.toolbox,
    NumberParameter.toolbox,
    StringParameter.toolbox,
    Parameters.toolbox,
    SystemParameter.toolbox,
    PlayerParameter.toolbox,
    RectangleParameter.toolbox,
    PointParameter.toolbox
  ]
}

function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function ParameterRegister(parameters: any) {
  RegisterData(BooleanParameter, parameters)
  RegisterData(NumberParameter, parameters)
  RegisterData(StringParameter, parameters)
  RegisterData(Parameters, parameters)
  RegisterData(SystemParameter, parameters)
  RegisterData(PlayerParameter, parameters)
  RegisterData(RectangleParameter, parameters)
  RegisterData(PointParameter, parameters)

}
export {
  ParameterCategory,
  ParameterRegister
}
