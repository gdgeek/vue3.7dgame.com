import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Skip global error toast handling for this request. */
    skipErrorMessage?: boolean;
    /** Distinguish host auth from plugin auth. */
    authScope?: "host" | "plugin";
  }

  interface InternalAxiosRequestConfig {
    /** Skip global error toast handling for this request. */
    skipErrorMessage?: boolean;
    /** Distinguish host auth from plugin auth. */
    authScope?: "host" | "plugin";
  }
}
