import SparkMD5 from 'spark-md5'
function fileMD5(file, progress = p => {}) {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5()
    const reader = new FileReader()
    const blobSlice =
      File.prototype.mozSlice ||
      File.prototype.webkitSlice ||
      File.prototype.slice
    const chunkSize = 2097152
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0
    reader.onload = function (e) {
      spark.appendBinary(e.target.result)
      currentChunk++
      progress((currentChunk + 1) / chunks)
      if (currentChunk < chunks) {
        doLoad()
      } else {
        resolve(spark.end())
      }
    }
    function doLoad() {
      let start = currentChunk * chunkSize
      let end = start + chunkSize >= file.size ? file.size : start + chunkSize

      const d = blobSlice.call(file, start, end)
      reader.readAsBinaryString(d)
    }
    doLoad()
  })
}
async function fileOpen(accept) {
  return new Promise((resolve, reject) => {
    try {
      const input = document.createElement('input')

      input.type = 'file'
      input.accept = accept
      input.onchange = function (e) {
        const file = this.files[0]
        console.log(file)
        const patternFileExtension = /\.([0-9a-z]+)(?:[\\?#]|$)/i
        const extension = file.name.match(patternFileExtension)
        file.extension = extension[0]
        resolve(file)
      }

      input.click()
    } catch (err) {
      alert(err)
      reject(err)
    }
  })
}
async function sleep(time) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(null)
    }, time)
  })
}
export { fileOpen, fileMD5, sleep }
