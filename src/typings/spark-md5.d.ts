declare module "spark-md5" {
  export default class SparkMD5 {
    constructor();
    append(data: ArrayBuffer | string): void;
    end(raw?: boolean): string;
    static ArrayBuffer(): SparkMD5;
  }
}
