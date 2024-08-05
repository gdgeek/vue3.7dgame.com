import Type from './type';
import * as Blockly from 'blockly';

import Vector3Data from './vector3_data';
import TransformData from './transform_data';
import 'blockly/lua';
import { LuaGenerator } from 'blockly/lua';

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => [string, number];
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

// 创建 Lua 生成器实例
const luaGeneratorInstance = new LuaGenerator() as any;

function RegisterData(data: Data, parameters: any): void {
  Blockly.Blocks[data.title] = data.getBlock(parameters);
  luaGeneratorInstance[data.title] = data.getLua(parameters);
}

function DataRegister(parameters: any): void {
  RegisterData(Vector3Data, parameters);
  RegisterData(TransformData, parameters);
  // RegisterData(ModuleToTransformData, parameters);
}

export { DataCategory, DataRegister };
