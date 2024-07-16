import COS from 'cos-js-sdk-v5'
import { token, store, cloud } from '@/api/v1/tencent-cloud'
import { fileMD5, fileOpen, sleep } from './base.js'
import path from 'path'
/*
async function storeHandler() {

  //const response = await store()
  return await publicHandler()
}*/
async function publicHandler() { 
  const response = await cloud()
  return await fileHandler(response.data.public.bucket, response.data.public.region)
}
async function privateHandler() { 

  const response = await cloud()
  const handler = await fileHandler(response.data.private.bucket, response.data.private.region)

  return handler
}
async function rawHandler() {
  const response = await store()
  return await fileHandler(response.data.raw.bucket, response.data.raw.region)
}
async function fileHandler(bucket, region) {
  return new Promise(async (resolve, reject) => {
    try {
      const cos = new COS({
        getAuthorization: async function (options, callback) {
          const response = await token(bucket, region)
          console.log(response.data)

          if (response.data) {
            const data = response.data
            const credentials = data && data.Credentials
            console.error(credentials)
            if (!data || !credentials) {
              reject('credentials invalid')
            }
            callback({
              TmpSecretId: credentials.TmpSecretId,
              TmpSecretKey: credentials.TmpSecretKey,
              SecurityToken: credentials.Token,
              // 建议返回服务器时间作为签名的开始时间，避免用户浏览器本地时间偏差过大导致签名错误
              StartTime: data.StartTime, // 时间戳，单位秒，如：1580000000
              ExpiredTime: data.ExpiredTime // 时间戳，单位秒，如：1580000900
            })
          } else {
            reject('no data!')
          }
        }
      })
      resolve({ cos, bucket, region })
    } catch (err) {
      reject(err)
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

        if (!has) {
          progress((Date.now() - start) / (2 * time))
          await sleep(500)
        } else {
          const data = await fileDownload(
            md5,
            extension,
            function (p) {
              progress((1 + p) / 2)
            },
            handler,
            dir
          )
          progress(1)
          console.error(data)
          resolve(data)
          return
        }
      } while (Date.now() < start + time)

      alert('处理超时！')

      throw 'overtime!'
    } catch (err) {
      reject(err)
    }
  })
}
async function fileDownload(name, extension, progress, handler, dir = '') {
  console.error(handler)
  const filename = path.join(dir, name + extension)

  return new Promise(async (resolve, reject) => {
    try {
      //下载文件
      const data = await handler.cos.getObject({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename,
        onProgress: function (progressData) {
          console.log('下载中', JSON.stringify(progressData))
          progress(progressData.percent)
        }
      })
      console.error(data)
      resolve(JSON.parse(data.Body))
    } catch (err) {
      reject(err)
    }
  })
}
async function fileUpload(md5, extension, file, progress, handler, dir = '') {
  const filename = path.join(dir, md5 + extension)
  console.error(filename)
  return new Promise(async (resolve, reject) => {
    try {
      // 分片上传文件
      const data = await handler.cos.uploadFile({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename,
        Body: file,
        onHashProgress: function (progressData) {
          console.log('校验中', JSON.stringify(progressData))
        },
        onProgress: function (progressData) {
          progress(progressData.percent)
          console.log('上传中', JSON.stringify(progressData))
        }
      })
      resolve(data)
    } catch (err) {
      reject(err)
    }
  })
}
function getUrl(info, file, handler) {
  let url = handler.cos.getObjectUrl(
    {
      Bucket: info.bucket.bucket,
      Region: info.bucket.region,
      Key: path.join(info.path, info.root, file.md5 + file.ext),
      Expires: 60,
      Sign: true
    },
    function (err, data) {
      console.log(err || (data && data.Url))
    }
  )
  return url
}
function fileUrl(md5, extension, handler, dir = '') {
  const filename = path.join(dir, md5 + extension)
  let url = handler.cos.getObjectUrl(
    {
      Bucket: handler.bucket,
      Region: handler.region,
      Key: filename,
      Expires: 60,
      Sign: true
    },
    function (err, data) {
      console.log(err || (data && data.Url))
    }
  )
  return url
}
async function fileHas(md5, extension, handler, dir = '') {
  const filename = path.join(dir, md5 + extension)
  return new Promise(async (resolve, reject) => {
    try {
      await handler.cos.headObject({
        Bucket: handler.bucket,
        Region: handler.region,
        Key: filename
      })
      resolve(true)
    } catch (err) {
      resolve(false)
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
  //storeHandler,
  //rawHandler,
  publicHandler,
  privateHandler,
  getUrl
}
