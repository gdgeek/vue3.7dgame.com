import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Skip global error toast handling for this request. */
    skipErrorMessage?: boolean;
  }

  interface InternalAxiosRequestConfig {
    /** Skip global error toast handling for this request. */
    skipErrorMessage?: boolean;
  }
}
