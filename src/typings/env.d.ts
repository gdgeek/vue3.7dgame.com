// https://cn.vitejs.dev/guide/env-and-mode

declare module "*.vue" {
  import { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

// TypeScript 类型提示都为 string： https://github.com/vitejs/vite/issues/6930
interface ImportMetaEnv {
  /** 应用端口 */
  VITE_APP_PORT: number;
  /** API 地址 */
  VITE_APP_API_URL: string;
  /** 微信登录认证服务地址 */
  VITE_APP_AUTH_API?: string;
  /** 认证服务选择 */
  VITE_AUTH_PROVIDER?: string;
  /** 是否启用阶段 8 OIDC bridge */
  VITE_IDENTITY_OIDC_BRIDGE_ENABLED?: string;
  /** OIDC bridge client id */
  VITE_IDENTITY_OIDC_CLIENT_ID?: string;
  /** OIDC bridge redirect URI */
  VITE_IDENTITY_OIDC_REDIRECT_URI?: string;
  /** OIDC bridge scopes */
  VITE_IDENTITY_OIDC_SCOPE?: string;
  /** Unity WebGL 场景预览地址 */
  VITE_APP_UNITY_PREVIEW_URL?: string;
  /** 是否开启 Mock 服务 */
  VITE_MOCK_DEV_SERVER: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/**
 * 平台的名称、版本、运行所需的`node`版本、依赖、构建时间的类型提示
 */
declare const __APP_INFO__: {
  pkg: {
    name: string;
    version: string;
    engines: {
      node: string;
    };
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  buildTimestamp: number;
};
