import Type from './type'
import Blockly from 'blockly'

import Vector3Data from './vector3_data'
import TransformData from './transform_data'
import ModuleToTransformData from './module_to_transform_data'

const DataCategory = {
  kind: 'category',
  name: '数据',
  colour: Type.colour,
  contents: [
    Vector3Data.toolbox,
    TransformData.toolbox,
    //ModuleToTransformData.toolbox
  ]
}

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)

}
function DataRegister(parameters) {
  RegisterData(Vector3Data, parameters)
  RegisterData(TransformData, parameters)
  //RegisterData(ModuleToTransformData, parameters)
}
export { DataCategory, DataRegister }
