// import { createContext, useContext } from 'solid-js';
// import { Store } from 'solid-js/store';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

export interface Args {
  cwd?: string;
  file?: string;
  room?: string;
  text?: any;
}

export interface PrettierConfig {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
}

export interface Config {
  theme?: string;
  codeTheme?: string;
  font?: string;
  fontSize: number;
  contentWidth: number;
  alwaysOnTop: boolean;
  typewriterMode: boolean;
  prettier: PrettierConfig;
}

export interface ErrorObject {
  id: string;
  props?: unknown;
}

export interface YOptions {
  prosemirrorType: Y.XmlFragment;
  configType: Y.Map<any>;
  provider: WebsocketProvider;
}

export interface Collab {
  started?: boolean;
  error?: boolean;
  room?: string;
  y?: YOptions;
}

export type LoadingType = 'loading' | 'initialized';

export interface State {
  editorView?: any;
  /** if true, show plain md text; if false, show instant md preview   */
  markdown?: boolean;
  lastModified?: Date;
  files: File[];
  config: Config;
  error?: ErrorObject;
  loading: LoadingType;
  fullscreen: boolean;
  collab?: Collab;
  path?: string;
  args?: Args;
}

export interface File {
  text?: { [key: string]: any };
  ydoc?: Uint8Array;
  lastModified?: string;
  path?: string;
  markdown?: boolean;
  collab?: Collab;
}

export class ServiceError extends Error {
  public errorObject: ErrorObject;
  constructor(id: string, props: unknown) {
    super(id);
    this.errorObject = { id, props };
  }
}

// export const StateContext = createContext<[Store<State>, any]>([
//   undefined,
//   undefined,
// ]);
// export const useState = () => useContext(StateContext);

export const getInitialState = (props: Partial<State> = {}): State => ({
  files: [],
  loading: 'loading',
  fullscreen: false,
  markdown: false,
  config: {
    fontSize: 24,
    contentWidth: 800,
    alwaysOnTop: false,
    typewriterMode: false,
    prettier: {
      printWidth: 80,
      tabWidth: 2,
      useTabs: false,
      semi: false,
      singleQuote: true,
    },
  },
  ...props,
});
