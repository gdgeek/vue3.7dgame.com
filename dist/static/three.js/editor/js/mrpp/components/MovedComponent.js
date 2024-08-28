import { UIPanel, UINumber, UIBreak, UICheckbox, UIText, UIButton, UIRow, UIInput, UIHorizontalRule } from '../../libs/ui.js';

import { SetValueCommand } from '../../commands/SetValueCommand.js';
class MovedComponent {

  constructor(editor, object, component) {

    this.editor = editor;
    this.object = object;
    this.component = component;

  }
  static Create() {
    const component = {
      type: 'Moved',
      parameters: {
        uuid: THREE.MathUtils.generateUUID(),
        magnetic: false,
        scalable: false,
        limit: {
          x: { enable: false, min: 0, max: 0 },
          y: { enable: false, min: 0, max: 0 },
          z: { enable: false, min: 0, max: 0 }
        }
      }
    }
    return component;
  }


  refresh(container) {

    const strings = this.editor.strings;
    {
      let row = new UIRow()

      if (!this.component.parameters.limit) {
        this.component.parameters.limit = {}
      }

      if (!this.component.parameters.limit.x) {
        this.component.parameters.limit.x = { enable: false }
      }
      if (!this.component.parameters.limit.y) {
        this.component.parameters.limit.y = { enable: false }
      }
      if (!this.component.parameters.limit.z) {
        this.component.parameters.limit.z = { enable: false }
      }

      const magnetic = new UICheckbox().setValue(this.component.parameters.magnetic)
        .setWidth('50px').onChange(() => {
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'magnetic', magnetic.getValue()));
        });

      row.add(
        new UIText('磁力').setWidth('90px')
      )
      row.add(magnetic)

      container.add(row)
    }
    {
      this.row = new UIRow()
      const scalable = new UICheckbox().setValue(this.component.parameters.scalable)
        .setWidth('50px').onChange((item) => {
          console.error(item)
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'scalable', scalable.getValue()));
        });
      this.row.add(
        new UIText('可缩放').setWidth('90px')
      )
      this.row.add(scalable)
      container.add(this.row)
    }
    {

      const limitX = this.limitIt(
        new UIRow().add(
          new UIText('X限位').setWidth('90px')
        ), 'x')
      container.add(limitX)
    }

    {

      const limitY = this.limitIt(
        new UIRow().add(
          new UIText('Y限位').setWidth('90px')
        ), 'y')
      container.add(limitY)
    }

    {

      const limitZ = this.limitIt(
        new UIRow().add(
          new UIText('Z限位').setWidth('90px')
        ), 'z')
      container.add(limitZ)
    }
    {
      const trigger = this.trigger(new UIRow().add(
        new UIText('触发事件').setWidth('90px')
      ), this.component.parameters.action)
      container.add(trigger)
    }

  }
  trigger(container, action) {
    const enable = new UICheckbox().setWidth('50px').setValue(typeof action !== 'undefined')
      .onChange(() => {
        if (enable.getValue()) {

          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'action', 'moved'));
          //  this.component.parameters.action = 'moved';
        } else {

          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'action', undefined));
          //  delete this.component.parameters.action
        }
        this.editor.signals.componentChanged.dispatch(this.component)
      })

    container.add(enable)
    if (action) {
      const input = new UIInput().setValue(action ? action : '').setWidth('90px').setFontSize('12px')
        .onChange(() => {
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters, 'action', input.getValue()));
        });
      container.add(input)
    }
    return container
  }
  limitIt(container, prop) {
    const item = this.component.parameters.limit[prop]


    const enable = new UICheckbox()
      .setWidth('50px').setValue(item.enable).onChange(() => {
        if (enable.getValue()) {
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters.limit, prop, { enable: true, min: 0, max: 0 }));
        } else {
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters.limit, prop, { enable: false }));
        }
        this.editor.signals.componentChanged.dispatch(this.component)
      })

    container.add(enable)

    if (item.enable) {
      const min = new UINumber().setValue(item.min)
        .setStep(1)
        .setRange(-9999, 0)
        .setWidth('50px').onChange(() => {
          item.min = min.getValue();
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters.limit, prop, item));

        })
      const max = new UINumber().setValue(item.max)
        .setStep(1)
        .setRange(0, 9999)
        .setWidth('50px').onChange(() => {
          item.max = max.getValue();
          this.editor.execute(new SetValueCommand(this.editor, this.component.parameters.limit, prop, item));
        })

      container.add(min, max)
    }
    return container
  }

  renderer(container) {

    this.refresh(container);
    //this.updateUI();
  }
}
export { MovedComponent };
