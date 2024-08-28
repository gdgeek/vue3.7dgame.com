import { UIPanel, UIBreak, UIText, UIButton, UIRow, UISelect, UIInput, UIHorizontalRule } from './libs/ui.js';

import { AddEventCommand } from './commands/AddEventCommand.js';
import { RemoveEventCommand } from './commands/RemoveEventCommand.js';
import { EventContainer } from './mrpp/EventContainer.js';
//import { AddEventCommand } from './commands/AddEventCommand.js';
//import { ComponentContainer } from './mrpp/ComponentContainer.js';
//import { RemoveComponentCommand } from './commands/RemoveComponentCommand.js';

function SidebarEvents(editor) {

	const strings = editor.strings;

	const signals = editor.signals;
	/*
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
	*/


	const container = new UIPanel();
	container.setDisplay('none');




	const top = new UIRow();
	container.add(top);


	const inputList = new UIRow();
	container.add(inputList);


	const outputList = new UIRow();
	container.add(outputList);

	function update() {

		top.clear();
		top.setDisplay('none');
		inputList.clear();
		inputList.setDisplay('none');
		outputList.clear();
		outputList.setDisplay('none');

		if (editor.selected === editor.scene) {
			top.setDisplay('block');
			top.add(new UIText("Events").setTextTransform('uppercase'));

			top.add(new UIBreak());
			top.add(new UIBreak());


			inputList.setDisplay('block');


			inputList.add(new UIText("Inputs").setTextTransform('uppercase'));
			inputList.add(new UIBreak());
			const label = new UIText('Input:');
			inputList.add(label);


			const input = new UIInput().setWidth('100px');
			input.setValue("");

			inputList.add(input);



			const newInput = new UIButton('new');
			newInput.onClick(function () {
				const key = input.getValue();
				if (key) {
					const command = new AddEventCommand(editor, { title: key, uuid: THREE.MathUtils.generateUUID() }, 'input');

					editor.execute(command);
				}

			}.bind(this));
			inputList.add(newInput);
			inputList.add(new UIBreak());
			inputList.add(new UIBreak());



			const inputs = editor.scene.events.inputs;
			console.error(inputs);

			if (inputs !== undefined && inputs.length > 0) {

				inputList.setDisplay('block');
				for (let i = 0; i < inputs.length; i++) {
					(function (event) {
						inputList.add(new UIHorizontalRule());

						const ec = new EventContainer(editor, event, 'input');
						ec.renderer(inputList);



						// 将水平分隔线添加到容器中
						inputList.add(new UIBreak());

					})(inputs[i]);
				}

			}

			{
				outputList.add(new UIText("Outputs").setTextTransform('uppercase'));
				outputList.add(new UIBreak());
				const label = new UIText('Output:');
				outputList.add(label);

				// 创建下拉框
				const output = new UIInput().setWidth('100px');
				output.setValue("");

				outputList.add(output);

				const newOutput = new UIButton('new');
				newOutput.onClick(function () {
					const key = output.getValue();
					if (key) {
						const command = new AddEventCommand(editor, { title: key, uuid: THREE.MathUtils.generateUUID() }, 'output');
						editor.execute(command);
					}

				}.bind(this));
				outputList.add(newOutput);

				outputList.add(new UIBreak());
				outputList.add(new UIBreak());
			}
			const outputs = editor.scene.events.outputs;


			if (outputs !== undefined && outputs.length > 0) {

				outputList.setDisplay('block');
				for (let i = 0; i < outputs.length; i++) {
					(function (event) {
						outputList.add(new UIHorizontalRule());

						const ec = new EventContainer(editor, event, 'output');
						ec.renderer(outputList);

						// 将水平分隔线添加到容器中
						outputList.add(new UIBreak());

					})(outputs[i]);
				}

			}
			outputList.setDisplay('block');
		}



	}

	signals.objectSelected.add(function (object) {

		if (object !== null && editor.camera !== object) {

			container.setDisplay('block');

			update();

		} else {

			container.setDisplay('none');

		}

	});

	signals.eventAdded.add(update);
	signals.eventRemoved.add(update);
	signals.eventChanged.add(update)
	return container;

}

export { SidebarEvents };
