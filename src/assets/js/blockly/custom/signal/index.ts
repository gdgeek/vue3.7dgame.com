import Type from './type'
import * as Blockly from 'blockly';
import OutputSignal from './output_signal'
import OutputSignalWithParameter from './output_signal_with_parameter'
import InputSignal from './input_signal'
import InitSignal from './init_signal'
import { LuaGenerator, Order } from 'blockly/lua';

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string;
}

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

const SignalCategory = {
  kind: 'category',
  name: '信号',
  colour: Type.colour,
  contents: [
    OutputSignal.toolbox,
    InputSignal.toolbox,
    OutputSignalWithParameter.toolbox,
    InitSignal.toolbox,
  ]
}

function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function SignalRegister(parameters: any) {
  RegisterData(OutputSignal, parameters)
  RegisterData(InputSignal, parameters)
  RegisterData(OutputSignalWithParameter, parameters)
  RegisterData(InitSignal, parameters)

}
export { SignalCategory, SignalRegister }
