import { useFileStore } from "@/store/modules/config";

/** Upload the bytes through the configured resource store and prepare the /files record. */
export async function uploadResourceFile(
  file: File,
  directory: string,
  options: {
    onHash?: (progress: number) => void;
    onUpload?: (progress: number) => void;
  } = {}
) {
  const { store } = useFileStore();
  const md5 = await store.fileMD5(file, options.onHash);
  options.onHash?.(1);
  const dot = file.name.lastIndexOf(".");
  const extension = dot < 0 ? ".bytes" : file.name.slice(dot);
  const handler = await store.publicHandler();
  options.onUpload?.(0);
  if (!(await store.fileHas(md5, extension, handler, directory))) {
    await store.fileUpload(
      md5,
      extension,
      file,
      options.onUpload ?? (() => {}),
      handler,
      directory
    );
  }
  options.onUpload?.(1);
  return {
    handler,
    data: {
      filename: file.name,
      md5,
      key: md5 + extension,
      url: store.fileUrl(md5, extension, handler, directory, false),
      size: file.size,
      ...(file.type ? { type: file.type } : {}),
    },
  };
}
