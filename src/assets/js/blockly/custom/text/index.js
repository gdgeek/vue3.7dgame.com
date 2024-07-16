import Type from './type'
import Blockly from 'blockly'
import TextEntity from './text_entity'
import SetText from './set_text'

const TextCategory = {
  kind: 'category',
  name: '文字',
  colour: Type.colour,
  contents: [TextEntity.toolbox, SetText.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function TextRegister(parameters) {
  RegisterData(TextEntity, parameters)
  RegisterData(SetText, parameters)
}
export { TextCategory, TextRegister }
