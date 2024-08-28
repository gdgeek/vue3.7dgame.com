import { UIPanel, UIBreak, UIText, UIButton, UIRow, UISelect, UIInput, UIHorizontalRule } from './libs/ui.js';


import { AddComponentCommand } from './commands/AddComponentCommand.js';
import { AddScriptCommand } from './commands/AddScriptCommand.js';
import { SetScriptValueCommand } from './commands/SetScriptValueCommand.js';
import { RemoveScriptCommand } from './commands/RemoveScriptCommand.js';
import { ComponentContainer } from './mrpp/ComponentContainer.js';
//import { RemoveComponentCommand } from './commands/RemoveComponentCommand.js';

function SidebarMeta(editor) {

	const strings = editor.strings;

	const signals = editor.signals;

	editor.signals.messageReceive.add(async function (message) {

		if (message.action == 'setup-module') {
			const data = message.data;
			const node = editor.objectByUuid(data.uuid);

			if (node != null) {
				node.userData.data = JSON.stringify(data.setup);
				signals.objectChanged.dispatch(node);
			}
			//editor.get
		}
	});



	const container = new UIPanel();
	container.setDisplay('none');




	const top = new UIRow();
	container.add(top);


	function update() {
		top.clear();
		top.setDisplay('none');
		const object = editor.selected;

		if (object === null) {
			return;
		}
		top.setDisplay('block');


		if (object.userData.custom != 0) {
			top.add(new UIText("Meta(custom)").setTextTransform('uppercase'));
			top.add(new UIBreak());

			top.add(new UIBreak());
			const newComponent = new UIButton('edit');
			newComponent.onClick(function () {
				editor.signals.messageSend.dispatch({ action: 'edit-meta', data: { meta_id: object.userData.meta_id } });
			}.bind(this));
			top.add(newComponent);
		} else {

			top.add(new UIText("Meta(prefab)").setTextTransform('uppercase'));
			top.add(new UIBreak());

			top.add(new UIBreak());
			const newComponent = new UIButton('setup');
			newComponent.onClick(function () {
				editor.signals.messageSend.dispatch({ action: 'setup-prefab', data: { meta_id: object.userData.meta_id, uuid: object.uuid, data: object.userData.data } });
			}.bind(this));
			top.add(newComponent);
		}
	}

	// signals

	signals.objectSelected.add(function (object) {

		if (object !== null && editor.camera !== object) {

			container.setDisplay('block');

			update();

		} else {

			container.setDisplay('none');

		}

	});


	return container;

}

export { SidebarMeta };
