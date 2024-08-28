import { UIPanel, UINumber, UIBreak, UIText, UIButton, UIRow, UIInput, UIHorizontalRule } from '../libs/ui.js';
import { RemoveEventCommand } from '../commands/RemoveEventCommand.js';

class EventContainer {


  constructor(editor, event, mode) {
    this.editor = editor;
    this.event = event;
    this.mode = mode;
  }

  renderer(container) {
    const strings = this.editor.strings;
    container.add(new UIText(this.event.title));
    //container.setDisplay('block');
    //container.add(new UIText(this.event.title));
    //container.setDisplay('block');


    const remove = new UIButton(strings.getKey('sidebar/script/remove'));
    remove.setMarginLeft('4px');
    remove.onClick(function () {
      if (confirm('Are you sure?')) {
        this.editor.execute(new RemoveEventCommand(this.editor, this.event, this.mode));
      }
    }.bind(this));
    container.add(remove);
    container.add(new UIBreak());
  }

}
export { EventContainer };
