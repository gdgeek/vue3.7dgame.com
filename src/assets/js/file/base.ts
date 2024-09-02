import SparkMD5 from 'spark-md5';

// 文件对象类型
type FileWithExtension = File & { extension?: string };
function fileMD5(file: File, progress: (p: number) => void = () => {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer()
    const reader = new FileReader()
    const blobSlice =
      File.prototype.mozSlice ||
      File.prototype.webkitSlice ||
      File.prototype.slice
    const chunkSize = 2097152
    const chunks = Math.ceil(file.size / chunkSize)
    let currentChunk = 0

    reader.onload = function (e: ProgressEvent<FileReader>) {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer)
      }
      currentChunk++
      progress((currentChunk + 1) / chunks)
      if (currentChunk < chunks) {
        doLoad()
      } else {
        resolve(spark.end())
      }
    }

    reader.onerror = function () {
      reject(new Error("File reading failed"))
    }

    function doLoad() {
      const start = currentChunk * chunkSize
      const end = start + chunkSize >= file.size ? file.size : start + chunkSize
      const chunk = blobSlice.call(file, start, end)
      reader.readAsArrayBuffer(chunk)
    }

    doLoad()
  })
}

// 打开文件选择对话框并返回选择的文件
const fileOpen = (accept: string): Promise<FileWithExtension> =>
  new Promise((resolve, reject) => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;

      input.onchange = (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const patternFileExtension = /\.([0-9a-z]+)(?:[\\?#]|$)/i;
          const extensionMatch = file.name.match(patternFileExtension);
          if (extensionMatch) {
            (file as FileWithExtension).extension = extensionMatch[0];
          }
          resolve(file as FileWithExtension);
        } else {
          reject(new Error('No file selected')); 
        }
      };

      input.click();
    } catch (err) {
      alert(err);
      reject(err); 
    }
  });

// 延迟函数
const sleep = (time: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });

export { fileOpen, fileMD5, sleep };
