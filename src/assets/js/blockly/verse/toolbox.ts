import Logic from '@/assets/js/blockly/logic'
import Loop from '@/assets/js/blockly/loop'
import Math from '@/assets/js/blockly/math'
import Texts from '@/assets/js/blockly/texts'
import List from '@/assets/js/blockly/list'
import Colour from '@/assets/js/blockly/colour'

import { DataCategory } from '@/assets/js/blockly/custom/data/index'
import { TaskCategory } from '@/assets/js/blockly/custom/task/index'
import { SignalCategory } from '@/assets/js/blockly/custom/signal'

import { ParameterCategory } from '../custom/parameter'
const sep = {
  kind: 'sep'
}
const Variable = {
  kind: 'category',
  name: '变量',
  colour: '%{BKY_VARIABLES_HUE}',
  custom: 'VARIABLE'
}
const Procedure = {
  kind: 'category',
  name: '函数',
  colour: '%{BKY_PROCEDURES_HUE}',
  custom: 'PROCEDURE'
}

export default {
  kind: 'categoryToolbox',
  contents: [
    Logic,
    Loop,
    Math,
    Texts,
    List,
    Colour,

    sep,
    TaskCategory,
    ParameterCategory,
    DataCategory,
    /* ,
    TriggerCategory,*/
    SignalCategory,
    //ExecuteCategory,
    sep,

    Variable,
    Procedure
  ]
}
