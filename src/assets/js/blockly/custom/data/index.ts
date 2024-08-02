import Type from './type';
import Blockly from 'blockly';

import Vector3Data from './vector3_data';
import TransformData from './transform_data';
// import ModuleToTransformData from './module_to_transform_data';
import luaGenerator from 'blockly/lua';

interface LuaGenerator {
  [key: string]: any; // 允许使用字符串作为索引
}

interface Data {
  title: string;
  getBlock: (parameters: any) => any;
  getLua: (parameters: any) => any;
}

const DataCategory = {
  kind: 'category',
  name: '数据',
  colour: Type.colour,
  contents: [
    Vector3Data.toolbox,
    TransformData.toolbox,
    // ModuleToTransformData.toolbox
  ]
};

function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters);
  (luaGenerator as LuaGenerator)[data.title] = data.getLua(parameters);
}

function DataRegister(parameters: any) {
  RegisterData(Vector3Data, parameters);
  RegisterData(TransformData, parameters);
  // RegisterData(ModuleToTransformData, parameters);
}

export { DataCategory, DataRegister };
