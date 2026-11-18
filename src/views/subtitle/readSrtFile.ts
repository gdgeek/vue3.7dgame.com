export async function readSrtFile(file: File) {
  if (!/\.srt$/i.test(file.name) || file.size > 1048576) {
    throw new Error("请选择不超过 1 MiB 的 .srt 文件。");
  }
  try {
    const srt = new TextDecoder("utf-8", { fatal: true }).decode(
      await file.arrayBuffer()
    );
    return { name: file.name.replace(/\.srt$/i, ""), srt };
  } catch {
    throw new Error("无法读取 UTF-8 字幕，请检查文件编码。");
  }
}
