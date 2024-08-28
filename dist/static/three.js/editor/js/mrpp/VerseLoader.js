import * as THREE from 'three'
//import { SceneBuilder } from './SceneBuilder.js'
import { GLTFLoader } from '../../../examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from '../../../examples/jsm/loaders/DRACOLoader.js'
import { VerseFactory } from './VerseFactory.js'
import { MetaFactory } from './MetaFactory.js'
function VerseLoader(editor) {

	const types = ['Module']

	editor.selector = function (object) {

		return types.includes(object.type);
	}

	const self = this

	editor.signals.upload.add(function () {
		self.save()
	})
	const factory = new MetaFactory();
	//const metaFactory = new MetaFactory();
	//const builder = new SceneBuilder(editor)





	this.save = async function () {

		const root = editor.scene;
		const verse = await this.write(root)

		const data = {
			action: 'save-verse',
			data: JSON.stringify(verse)
		}

		editor.signals.messageSend.dispatch(data)
	}

	this.compareObjectsAndPrintDifferences = function (obj1, obj2, path = '', tolerance = 0.0001) {
		if (obj1 == null || obj2 == null) {
			console.log('One of the objects is null');
			return;
		}
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		for (let key of keys1) {
			const val1 = obj1[key];
			const val2 = obj2[key];
			const currentPath = path ? `${path}.${key}` : key;

			if (typeof val1 === 'object' && typeof val2 === 'object') {

				self.compareObjectsAndPrintDifferences(val1, val2, currentPath);
			} else if (typeof val1 === 'number' && typeof val2 === 'number') {
				if (Math.abs(val1 - val2) > tolerance) {
					console.log(`Difference found at: "${currentPath}":`);
					console.log(`Object 1: ${val1}`);
					console.log(`Object 2: ${val2}`);
				}
			} else if (val1 !== val2) {
				console.log(`Difference found at, ${currentPath}:`);
				console.log(`Object 1: ${val1}`);
				console.log(`Object 2: ${val2}`);
			}
		}

		// Check for keys present in obj2 but not in obj1
		for (let key of keys2) {
			if (!keys1.includes(key)) {
				const currentPath = path ? `${path}.${key}` : key;
				console.log(`Key ${currentPath} present in Object 2 but not in Object 1`);
			}
		}
	}
	/*
	this.loadIt = async function () {
		if (this.data.space) {
			space = await self.loadSpace(this.data.space)
			builder.lockNode(space)
			editor.scene.add(space)
		}


	}*/
	this.writeData = function (node) {

		if (!types.includes(node.type)) {
			return null;
		}
		const data = {}

		data.type = node.type


		data.parameters = {}
		data.parameters.uuid = node.uuid
		data.parameters.title = node.name
		data.parameters.transform = {}
		data.parameters.transform.position = {
			x: node.position.x,
			y: node.position.y,
			z: node.position.z
		}
		data.parameters.transform.rotate = {
			x: (node.rotation.x / Math.PI) * 180,
			y: (node.rotation.y / Math.PI) * 180,
			z: (node.rotation.z / Math.PI) * 180
		};
		data.parameters.transform.scale = {
			x: node.scale.x,
			y: node.scale.y,
			z: node.scale.z
		};
		const exclude = ['type', 'draggable', 'custom']

		Object.keys(node.userData).forEach(key => {
			if (!exclude.includes(key)) {
				data.parameters[key] = node.userData[key]
			}
		})
		//entity.parameters.transform.active = true
		//data.parameters.active = node.visible;
		return data;
	}

	this.write = async function (root) {

		const data = {}
		data.type = "Verse"
		data.parameters = { "uuid": root.uuid }
		data.parameters.space = { "id": -1, "occlusion": false }
		data.parameters.story = "{\"sorted\":[110],\"contactor\":false}"

		const modules = []

		root.children.forEach(node => {

			const nd = this.writeData(node)
			if (nd != null) {
				if (node.type == 'Module') {
					modules.push(nd)
				}
			}


		})
		data.children = { modules }
		console.error(data)
		return data;
	}

	this.read = async function (root, data, resources, metas) {
		root.uuid = data.parameters.uuid
		if (data.children.anchors) {
			data.children.anchors.forEach(async item => {
				await self.addAnchor(item, root)
			})
		}

		if (data.children.modules) {
			data.children.modules.forEach(async item => {

				const meta = metas.get(item.parameters.meta_id)

				const node = factory.addModule(item)

				alert(JSON.stringify(meta))

				node.userData.custom = meta.custom
				root.add(node)
				editor.signals.sceneGraphChanged.dispatch()
				if (meta && meta.data && meta.custom != 0) {
					await factory.readMeta(node, JSON.parse(meta.data), resources)
					editor.signals.sceneGraphChanged.dispatch()

				}
				await factory.addGizmo(node)
				editor.signals.sceneGraphChanged.dispatch()

			})
		}

	}
	this.clear = async function () {
		this.scene.clear()
	}
	this.load = async function (verse) {

		let scene = editor.scene;
		if (scene == null) {
			scene = new THREE.Scene();
			scene.name = "Scene"
			editor.setScene(scene)
		}

		editor.signals.sceneGraphChanged.dispatch()
		let lights = editor.scene.getObjectByName("$lights")
		if (lights == null) {
			lights = new THREE.Group();
			lights.name = "$lights";
			const light1 = new THREE.DirectionalLight(0xffffff, 0.5)
			light1.position.set(-0.5, 0, 0.7)
			light1.name = "light1"
			lights.add(light1);
			const light2 = new THREE.AmbientLight(0xffffff, 0.5)

			light2.name = "light2"
			lights.add(light2);
			const light3 = new THREE.PointLight(0xffffff, 1)
			light3.position.set(0, 0, 0)
			light3.name = "light3"
			lights.add(light3);
			scene.add(lights)
			factory.lockNode(lights)
			editor.signals.sceneGraphChanged.dispatch()
		}

		let root = editor.scene;


		if (verse.data !== null) {
			const data = JSON.parse(verse.data)
			if (typeof self.data !== 'undefined') {
				await this.removeNode(self.data, data)
			}

			const resources = new Map()
			verse.resources.forEach(item => {
				resources.set(item.id, item)
			})
			const metas = new Map()
			console.error(verse)
			verse.metas.forEach(item => {
				metas.set(item.id, item)
			})
			await this.read(root, data, resources, metas)
			const copy = await this.write(root);

			self.compareObjectsAndPrintDifferences(data, copy)
			editor.signals.sceneGraphChanged.dispatch()
		}



		editor.signals.sceneGraphChanged.dispatch()
	}
}
export { VerseLoader }
