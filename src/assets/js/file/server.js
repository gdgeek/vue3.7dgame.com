import { fileMD5, fileOpen, sleep } from './base.js'

import env from '@/environment.js'
import axios from 'axios'
import { uploadFile } from '@/api/v1/upload'
var qs = require('querystringify')
var path = require('path')

function fileUrl(name, extension, handler = null, dir = '') {
  const filename = name + extension

  const url =
    env.api + '/' + path.join('storage', handler.bucket, dir, filename)

  return url
}

function fileHas(name, extension, handler = null, dir = '') {
  return new Promise((resolve, reject) => {
    axios
      .head(env.replaceIP(fileUrl(name, extension, handler, dir)))
      .then(function (response) {
        resolve(true)
      })
      .catch(function (error) {
        resolve(false)
      })
  })
}
async function publicHandler() {
  return await fileHandler('store')
}
async function privateHandler() {
  return await fileHandler('raw')
}
function fileHandler(bucket) {
  return new Promise((resolve, reject) => {
    resolve({ bucket })
  })
}

function fileUpdateImpl(md5, extension, file, progress, handler, dir, skip) {
  const filename = md5 + extension

  return new Promise(async (resolve, reject) => {
    const data = new FormData() //初始化一个FormData对象
    const blockSize = 1048576 //每块的大小
    const nextSize = Math.min((skip + 1) * blockSize, file.size) //读取到结束位置
    const fileData = file.slice(skip * blockSize, nextSize) //截取 部分文件 块

    data.append('file', fileData) //将 部分文件 塞入FormData
    data.append('filename', filename) //保存文件名字
    data.append('md5', md5) //将 部分文件 塞入FormData
    data.append('skip', skip)
    data.append('block_size', blockSize)
    data.append('upload_size', nextSize)
    data.append('size', file.size)
    data.append('directory', dir)
    data.append('bucket', handler.bucket)

    try {
      const response = await uploadFile(data)
      if (file.size <= nextSize) {
        progress(1)
        resolve(response)
      } else {
        progress(nextSize / file.size)
        const response = await fileUpdateImpl(
          md5,
          extension,
          file,
          progress,
          handler,
          dir,
          ++skip
        )

        resolve(response)
      }
    } catch (e) {
      reject(e)
    }
  })
}

function fileUpload(md5, extension, file, progress, handler, dir = '') {
  return new Promise((resolve, reject) => {
    fileUpdateImpl(md5, extension, file, progress, handler, dir, 0)
      .then(response => {
        resolve(response)
      })
      .catch(error => {
        reject(error)
      })
  })
}
function getUrl(info, file, handler) {
  const url = ''
  return url
}

async function fileDownload(name, extension, progress, handler, dir = '') {
  return new Promise(async (resolve, reject) => {
    try {
      const url = fileUrl(name, extension, handler, dir)
      const response = await axios.get(env.replaceIP(url))
      resolve(response.data)
    } catch (err) {
      resolve(null)
    }
  })
}

async function fileProcess(
  md5,
  extension,
  progress,
  handler,
  dir = '',
  time = 1000
) {
  return new Promise(async (resolve, reject) => {
    try {
      const start = Date.now()
      do {
        console.log(handler)
        const has = await fileHas(md5, extension, handler, dir)

        if (has === null) {
          progress((Date.now() - start) / (2 * time))
          await sleep(500)
        } else {
          const file = await fileDownload(
            md5,
            extension,
            function (p) {
              progress((1 + p) / 2)
            },
            handler,
            dir
          )
          aler(1)
          progress(1)
          resolve(file)
          break
        }
      } while (Date.now() < start + time)
      throw 'overtime!'
    } catch (err) {
      reject(err)
    }
  })
}

export default {
  fileMD5,
  fileOpen,
  fileHas,
  fileUrl,
  fileUpload,
  fileProcess,
  fileDownload,
  publicHandler,
  privateHandler,
  getUrl
}
