/*
<category name="%{BKY_CATTEXT}" colour="%{BKY_TEXTS_HUE}">
     
      
      <block type="text_prompt_ext">
        <value name="TEXT">
          <shadow type="text">
            <field name="TEXT">abc</field>
          </shadow>
        </value>
      </block>
    </category>
*/


export default {
  kind: 'category',
  name: '文本',
  colour: '%{BKY_TEXTS_HUE}',

  contents: [
    {
      kind: 'block',
      type: 'text',
      fields: {
        TEXT: 'abc'
      }
    },
    {
      kind: 'block',
      type: 'text_join'
    },
    {
      kind: 'block',
      type: 'text_append',
      inputs: {
        TEXT: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_length',
      inputs: {
        VALUE: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_isEmpty',
      inputs: {
        VALUE: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: null
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_indexOf',
      inputs: {
        VALUE: {
          block: {
            type: 'variables_get',
            fields: {
              VAR: 'text'
            }
          }
        },
        FIND: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_charAt',
      inputs: {
        VALUE: {
          block: {
            type: 'variables_get',
            fields: {
              VAR: 'text'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_getSubstring',
      inputs: {
        STRING: {
          block: {
            type: 'variables_get',
            fields: {
              VAR: 'text'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_changeCase',
      inputs: {
        TEXT: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_trim',
      inputs: {
        TEXT: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_print',
      inputs: {
        TEXT: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    },
    {
      kind: 'block',
      type: 'text_prompt_ext',
      inputs: {
        TEXT: {
          shadow: {
            type: 'text',
            fields: {
              TEXT: 'abc'
            }
          }
        }
      }
    } 
  ]
}
