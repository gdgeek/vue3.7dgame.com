import * as THREE from 'three'

import { GLTFLoader } from '../../../examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from '../../../examples/jsm/loaders/DRACOLoader.js'
import { VOXLoader, VOXMesh } from '../../../examples/jsm/loaders/VOXLoader.js'

import { Factory } from './Factory.js'
class MetaFactory extends Factory {
	constructor() {
		super()
	}
	async addGizmo(node) {

		return new Promise(resolve => {
			const loader = new GLTFLoader(THREE.DefaultLoadingManager)
			loader.load('/three.js/mesh/unreal-gizmo.glb', gltf => {
				const mesh = gltf.scene;//.children[0]
				mesh.scale.set(0.1, 0.1, 0.1)
				mesh.rotation.set(Math.PI / 2, Math.PI / 2, 0)
				this.lockNode(gltf.scene)
				node.add(gltf.scene)
				resolve()
			})
		})
	}

	addModule(data) {

		const node = new THREE.Group()
		node.name = data.parameters.title
		console.error(data)
		node.type = data.type;
		node.uuid = data.parameters.uuid

		const transform = data.parameters.transform
		this.setTransform(node, transform)

		const userData = {}

		const exclude = ['name', 'title', 'uuid', 'transform', 'active']

		Object.keys(data.parameters).forEach(key => {
			if (!exclude.includes(key)) {
				userData[key] = data.parameters[key]
			}
		})

		userData.draggable = false
		node.userData = userData
		return node;
	}
	async readMeta(root, data, resources, editor = null) {


		if (data.children) {
			for (let i = 0; i < data.children.entities.length; ++i) {
				if (data.children.entities[i] != null) {
					try {
						const node = await this.building(data.children.entities[i], resources)

						if (node != null) {
							root.add(node)
							if (editor != null) {
								editor.signals.sceneGraphChanged.dispatch()
							}
						}
					} catch (error) {
						console.error(error)
					}
				}
			}
		}
	}


	async loadVoxel(url) {
		return new Promise((resolve, reject) => {
			const loader = new VOXLoader()
			loader.load(
				url,
				function (chunks) {
					const chunk = chunks[0]
					const mesh = new VOXMesh(chunk)

					//mesh.scale.set(0.005, 0.005, 0.005)
					resolve(mesh)
				}
			)
		}, function (xhr) {
			console.log((xhr.loaded / xhr.total) * 100 + '% loaded!')
		}, function (error) {
			reject(error)
			alert(error)
			console.error('An error happened')
		}
		)
	}

	async loadPolygen(url) {

		const self = this
		return new Promise((resolve, reject) => {
			const loader = new GLTFLoader(THREE.DefaultLoadingManager)
			const dracoLoader = new DRACOLoader()

			dracoLoader.setDecoderPath("/js/three.js/libs/draco/");
			loader.setDRACOLoader(dracoLoader)

			try {
				loader.load(
					url,
					function (gltf) {


						resolve(gltf.scene)
						gltf.scene.children.forEach(item => {
							self.lockNode(item)
						})
					},
					function (xhr) {
						//console.log((xhr.loaded / xhr.total) * 100 + '% loaded!')
					},
					function (error) {
						resolve(null)
						console.error('An error happened')
					}
				)
			} catch (error) {
				resolve(null)
				console.error(error)
			}

		})
	}
	async getPolygen(data, resources) {
		if (resources.has(data.parameters.resource)) {
			const resource = resources.get(data.parameters.resource)
			const node = await this.loadPolygen(resource.file.url)

			return node
		}
		return null
	}

	async getPlane(url, width, height) {
		return new Promise(resolve => {
			const geometry = new THREE.PlaneGeometry(width, height)
			const loader = new THREE.TextureLoader()
			loader.load(url, texture => {
				const material = new THREE.MeshBasicMaterial({
					color: 0xffffff,
					side: THREE.DoubleSide,
					map: texture
				})
				resolve(new THREE.Mesh(geometry, material))
			}, function (xhr) {
				//console.log((xhr.loaded / xhr.total) * 100 + '% loaded!')
			}, function (error) {
				console.error(error)
				resolve(new THREE.Mesh(geometry))
			})

		})
	}

	async getPicture(data, resources) {

		const resource = resources.get(data.parameters.resource)
		const info = JSON.parse(resource.info)
		const size = info.size
		const width = data.parameters.width
		const height = width * (size.y / size.x)
		const node = await this.getPlane(resource.image.url, width, height)

		return node
	}
	async getEntity(data, resources) {
		const entity = new THREE.Group()
		entity.name = data.parameters.name
		return entity;
	}
	async getText(data, resources) {
		const text = data.parameters.text

		const geometry = new THREE.PlaneGeometry(
			0.1 * text.length + 0.05,
			0.1 + 0.05
		)
		const material = new THREE.MeshBasicMaterial({
			color: 0x8888ff,
			side: THREE.DoubleSide
		})
		const plane = new THREE.Mesh(geometry, material)

		plane.name = data.parameters.name + '[text]'
		return plane
	}
	async getVoxel(data, resources) {


		if (resources.has(data.parameters.resource)) {
			const resource = resources.get(data.parameters.resource)
			return await this.loadVoxel(resource.file.url)
		}
		return null
	}
	async getSound(data, resources) {
		if (resources.has(data.parameters.resource)) {

			const entity = new THREE.Group()
			entity.name = data.parameters.name
			return entity;
		}
		return null;
	}
	async getEmpty(data, resources) {
		const entity = new THREE.Group()
		entity.name = data.parameters.name
		return entity;
	}
	async getVideo(data, resources) {
		if (data.parameters.resource == undefined) {
			return null;
		}
		const resource = resources.get(data.parameters.resource)
		const info = JSON.parse(resource.info)
		const size = info.size
		const width = data.parameters.width
		const height = width * (size.y / size.x)
		return await this.getPlane(resource.image.url, width, height)
	}


	async building(data, resources) {

		let node = null
		switch (data.type.toLowerCase()) {

			case 'polygen':
				node = await this.getPolygen(data, resources)//resource
				break
			case 'picture':
				node = await this.getPicture(data, resources)//resource
				break
			case 'video':
				node = await this.getVideo(data, resources)//resource
				break
			case 'sound':
				node = await this.getSound(data, resources)//resource
				break
			case 'voxel':
				node = await this.getVoxel(data, resources)//resource
				break
			case 'text':
				node = await this.getText(data, resources)
				break
			case 'entity':
				node = await this.getEntity(data, resources)
				break
			case 'anchor':
				node = await this.addAnchor(data)
				break
		}
		if (node == null) {
			node = await this.getEmpty(data, resources)

		}
		node.type = data.type
		node.name = data.parameters.name
		node.uuid = data.parameters.uuid
		this.setTransform(node, data.parameters.transform)
		node.visible = data.parameters.active

		const userData = { "type": data.type }
		const exclude = ['name', 'uuid', 'transform', 'active']

		Object.keys(data.parameters).forEach(key => {
			if (!exclude.includes(key)) {

				userData[key] = data.parameters[key]
			}
		})
		node.components = data.children.components

		node.userData = userData
		for (let i = 0; i < data.children.entities.length; ++i) {
			const child = await this.building(data.children.entities[i], resources)
			if (child != null) {
				node.add(child)
			}
		}
		return node
	}

}

export { MetaFactory }
