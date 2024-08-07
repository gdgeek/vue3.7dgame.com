import Type from './type';
import * as Blockly from 'blockly';
import MetaAction from './meta_action';
import RunTask from './run_task';

import 'blockly/lua';
import { LuaGenerator, Order } from 'blockly/lua';

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string;
}

// 定义 MetaCategory 对象
const MetaCategory = {
  kind: 'category',
  name: 'Meta',
  colour: Type.colour,
  contents: [
    MetaAction.toolbox,
    RunTask.toolbox,
  ]
};

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

// 注册数据到 Blockly
function RegisterData(data: Data, parameters: any): void {
  // 注册块
  Blockly.Blocks[data.title] = data.getBlock(parameters);
  luaGeneratorInstance[data.title] = data.getLua(parameters);
}

// 注册所有块
function MetaRegister(parameters: any): void {
  RegisterData(MetaAction, parameters);
  RegisterData(RunTask, parameters);
}

export { MetaCategory, MetaRegister };
