import Type from './type'
import Blockly from 'blockly'
import SleepEntity from './sleep'

const HelperCategory = {
  kind: 'category',
  name: '其他',
  colour: Type.colour,
  contents: [SleepEntity.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function HelperRegister(parameters) {
  RegisterData(SleepEntity, parameters)
}
export { HelperCategory, HelperRegister }
