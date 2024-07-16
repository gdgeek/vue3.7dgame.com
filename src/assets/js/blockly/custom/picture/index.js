import Type from './type'
import Blockly from 'blockly'
import PictureEntity from './picture_entity'

const PictureCategory = {
  kind: 'category',
  name: '图片',
  colour: Type.colour,
  contents: [PictureEntity.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function PictureRegister(parameters) {
  RegisterData(PictureEntity, parameters)
}
export { PictureCategory, PictureRegister }
