import Type from './type'
import Blockly from 'blockly'
import OutputSignal from './output_signal'
import OutputSignalWithParameter from './output_signal_with_parameter'
import InputSignal from './input_signal'
import InitSignal from './init_signal'


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

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function SignalRegister(parameters) {
  RegisterData(OutputSignal, parameters)
  RegisterData(InputSignal, parameters)
  RegisterData(OutputSignalWithParameter, parameters)
  RegisterData(InitSignal, parameters)

}
export { SignalCategory, SignalRegister }
