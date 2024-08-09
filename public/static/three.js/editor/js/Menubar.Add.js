import * as THREE from 'three';

import { UIPanel, UIRow, UIHorizontalRule } from './libs/ui.js';

import { AddObjectCommand } from './commands/AddObjectCommand.js';
import { MetaFactory } from './mrpp/MetaFactory.js'
import { VerseFactory } from './mrpp/VerseFactory.js'
import { Builder } from './mrpp/Builder.js'

function MenubarAdd(editor) {

	const factory = new MetaFactory();

	const builder = new Builder();
	const strings = editor.strings;

	const resources = new Map()
	const container = new UIPanel();

	container.setClass('menu');

	const title = new UIPanel();
	title.setClass('title');
	title.setTextContent(strings.getKey('menubar/add'));
	container.add(title);

	const options = new UIPanel();
	options.setClass('options');
	container.add(options);


	let option = null;

	if (editor.type.toLowerCase() == 'meta') {

		editor.signals.messageReceive.add(async function (message) {

			if (message.action === 'load_resource') {

				resources.set(message.data.id, message.data)

				const data = builder.resource(message.data)
				//alert(message.data)
				if (data != null) {
					const node = await factory.building(data, resources);
					if (node != null) {
						editor.execute(new AddObjectCommand(editor, node));
					}
				}
			}
		});


		option = new UIRow();
		option.setClass('option');
		option.setTextContent("节点");
		option.onClick(async function () {
			const node = await factory.building(builder.entity(), resources);
			editor.execute(new AddObjectCommand(editor, node));

		});
		options.add(option);




		option = new UIRow();
		option.setClass('option');
		option.setTextContent("文本");
		option.onClick(async function () {
			const node = await factory.building(builder.text(), resources);
			editor.execute(new AddObjectCommand(editor, node));
		});
		options.add(option);


		option = new UIRow();
		option.setClass('option');
		option.setTextContent("体素");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'load_resource', data: { type: 'voxel' } });
		});
		options.add(option);




		option = new UIRow();
		option.setClass('option');
		option.setTextContent("模型");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'load_resource', data: { type: 'polygen' } });
		});
		options.add(option);


		option = new UIRow();
		option.setClass('option');
		option.setTextContent("音频");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'load_resource', data: { type: 'audio' } });
		});
		options.add(option);

		option = new UIRow();
		option.setClass('option');
		option.setTextContent("图片");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'load_resource', data: { type: 'picture' } });
		});
		options.add(option);

		option = new UIRow();
		option.setClass('option');
		option.setTextContent("视频");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'load_resource', data: { type: 'video' } });
		});
		options.add(option);

	} else if (editor.type.toLowerCase() == 'verse') {
		//const factory = new VerseFactory();
		editor.signals.messageReceive.add(async function (message) {

			if (message.action == 'add-module') {
				const data = message.data.data;
				const setup = message.data.setup;
				const title = message.data.title;

				console.error(data)

				if (data.resources) {
					data.resources.forEach(resource => {
						resources.set(resource.id, resource)
					})
				}


				const node = factory.addModule(builder.module(data.id, title))

				node.userData.data = JSON.stringify(setup)
				node.userData.custom = data.custom
				if (data && data.data) {
					await factory.readMeta(node, JSON.parse(data.data), resources, editor)
				}
				await factory.addGizmo(node)
				editor.execute(new AddObjectCommand(editor, node));

			}

		});


		option = new UIRow();
		option.setClass('option');
		option.setTextContent("Meta");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'add-meta' });
		});
		options.add(option);

		option = new UIRow();
		option.setClass('option');
		option.setTextContent("Prefab");
		option.onClick(async function () {
			editor.signals.messageSend.dispatch({ action: 'add-prefab' });
		});
		options.add(option);
	}

	//

	//options.add(new UIHorizontalRule());

	// AmbientLight

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/ambientlight'));
	option.onClick(function () {

		const color = 0x222222;

		const light = new THREE.AmbientLight(color);
		light.name = 'AmbientLight';

		editor.execute(new AddObjectCommand(editor, light));

	});
	//options.add(option);

	// DirectionalLight

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/directionallight'));
	option.onClick(function () {

		const color = 0xffffff;
		const intensity = 1;

		const light = new THREE.DirectionalLight(color, intensity);
		light.name = 'DirectionalLight';
		light.target.name = 'DirectionalLight Target';

		light.position.set(5, 10, 7.5);

		editor.execute(new AddObjectCommand(editor, light));

	});
	//options.add(option);

	// HemisphereLight

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/hemispherelight'));
	option.onClick(function () {

		const skyColor = 0x00aaff;
		const groundColor = 0xffaa00;
		const intensity = 1;

		const light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
		light.name = 'HemisphereLight';

		light.position.set(0, 10, 0);

		editor.execute(new AddObjectCommand(editor, light));

	});
	//options.add(option);

	// PointLight

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/pointlight'));
	option.onClick(function () {

		const color = 0xffffff;
		const intensity = 1;
		const distance = 0;

		const light = new THREE.PointLight(color, intensity, distance);
		light.name = 'PointLight';

		editor.execute(new AddObjectCommand(editor, light));

	});
	//options.add(option);

	// SpotLight

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/spotlight'));
	option.onClick(function () {

		const color = 0xffffff;
		const intensity = 1;
		const distance = 0;
		const angle = Math.PI * 0.1;
		const penumbra = 0;

		const light = new THREE.SpotLight(color, intensity, distance, angle, penumbra);
		light.name = 'SpotLight';
		light.target.name = 'SpotLight Target';

		light.position.set(5, 10, 7.5);

		editor.execute(new AddObjectCommand(editor, light));

	});
	//options.add(option);

	//

	//options.add(new UIHorizontalRule());

	// OrthographicCamera

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/orthographiccamera'));
	option.onClick(function () {

		const aspect = editor.camera.aspect;
		const camera = new THREE.OrthographicCamera(- aspect, aspect);
		camera.name = 'OrthographicCamera';

		editor.execute(new AddObjectCommand(editor, camera));

	});
	//options.add(option);

	// PerspectiveCamera

	option = new UIRow();
	option.setClass('option');
	option.setTextContent(strings.getKey('menubar/add/perspectivecamera'));
	option.onClick(function () {

		const camera = new THREE.PerspectiveCamera();
		camera.name = 'PerspectiveCamera';

		editor.execute(new AddObjectCommand(editor, camera));

	});
	//options.add(option);

	return container;

}

export { MenubarAdd };
