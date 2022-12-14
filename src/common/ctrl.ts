import * as db from 'idb-keyval';
import { fromUint8Array, toUint8Array } from 'js-base64';
import { deleteSelection, selectAll } from 'prosemirror-commands';
import { applyDevTools } from 'prosemirror-dev-toolkit';
import { redo, undo } from 'prosemirror-history';
import { Schema } from 'prosemirror-model';
import { EditorState, Transaction } from 'prosemirror-state';
import { EditorView, NodeViewConstructor } from 'prosemirror-view';
import { useState } from 'react';
import { debounce } from 'ts-debounce';
import {
  adjectives,
  animals,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import { v4 as uuidv4 } from 'uuid';
import { prosemirrorToYDoc, redo as yRedo, undo as yUndo } from 'y-prosemirror';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

import {
  ProseMirrorExtension,
  ProseMirrorState,
  isEmpty,
} from '../prosemirror/state';
import { isDarkTheme, themes } from './config';
import { COLLAB_URL, isTauri, mod } from './env';
import { createMarkdownParser, serialize } from './markdown';
import { createEmptyText, createExtensions, createSchema } from './prosemirror';
import {
  Collab,
  Config,
  File,
  ServiceError,
  State,
  getInitialState,
} from './state';

// import * as remote from './remote';
// import { Store, createStore, unwrap } from 'solid-js/store';

const isText = (x: any) => x && x.doc && x.selection;

const isState = (x: any) =>
  typeof x.lastModified !== 'string' && Array.isArray(x.files);

const isFile = (x: any): boolean => x && (x.text || x.path || x.ydoc);

const isConfig = (x: any): boolean =>
  (typeof x.theme === 'string' || x.theme === undefined) &&
  (typeof x.codeTheme === 'string' || x.codeTheme === undefined) &&
  (typeof x.font === 'string' || x.font === undefined);

/** 💡 创建并返回全局状态、返回初始化编辑器、操作编辑器的方法
 * - init()创建editorState
 * - createEditorView()创建editorView
 */
export const useCreateCtrlEditor = (initial: State) => {
  // 会返回这个store
  const [store, setState] = useState(initial);
  const [initialEditorState, setInitialEditorState] = useState({
    text: undefined,
    extensions: undefined,
  });

  const onReload = () => {
    if (!isTauri) return;
    window.location.reload();
  };

  const onQuit = () => {
    if (!isTauri) return;
    // remote.quit();
  };

  const onNew = () => {
    newFile();
    return true;
  };

  const onDiscard = () => {
    discard();
    return true;
  };

  const onFullscreen = () => {
    if (!isTauri) return;
    ctrl.setFullscreen(!store.fullscreen);
    return true;
  };

  const onUndo = () => {
    if (!store.editorView) return;
    if (store.collab?.started) {
      yUndo(store.editorView.state);
    } else {
      undo(store.editorView.state, store.editorView.dispatch);
    }

    return true;
  };

  const onRedo = () => {
    if (!store.editorView) return;
    if (store.collab?.started) {
      yRedo(store.editorView.state);
    } else {
      redo(store.editorView.state, store.editorView.dispatch);
    }

    return true;
  };

  const keymap = {
    [`${mod}-r`]: onReload,
    [`${mod}-q`]: onQuit,
    [`${mod}-n`]: onNew,
    [`${mod}-w`]: onDiscard,
    'Cmd-Enter': onFullscreen,
    'Alt-Enter': onFullscreen,
    [`${mod}-z`]: onUndo,
    [`Shift-${mod}-z`]: onRedo,
    [`${mod}-y`]: onRedo,
  };

  const addToFiles = (files: File[], prev: State, prevYdoc?: Uint8Array) => {
    let text;
    let ydoc;
    if (prevYdoc || prev.collab?.room) {
      ydoc = prevYdoc ?? Y.encodeStateAsUpdate(prev.collab.y.provider.doc);
    } else {
      text = prev.path ? undefined : store.editorView?.state.toJSON();
    }

    return [
      ...files,
      {
        text,
        ydoc,
        lastModified: prev.lastModified?.toISOString(),
        path: prev.path,
        markdown: prev.markdown,
        ...(prev.collab?.room ? { collab: { room: prev.collab.room } } : {}),
      },
    ];
  };

  const discardText = async () => {
    // const state: State = unwrap(store);
    const state: State = store;
    const index = state.files.length - 1;
    let file = index !== -1 ? state.files[index] : { text: createEmptyText() };
    const files = state.files.filter((f: File) => f !== file);

    if (file?.path) {
      file = await loadFile(state.config, file.path);
    }

    const next: Partial<State> = {
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
      collab: { room: file.collab?.room },
      args: { cwd: state.args?.cwd },
    };

    disconnectCollab(state.collab);
    let newState = { ...state, ...next };
    newState = doStartCollab(newState, undefined, file.ydoc);
    updateEditorState(newState, file.text ?? createEmptyText());

    setState({
      args: { cwd: state.args?.cwd },
      collab: undefined,
      error: undefined,
      ...newState,
      files,
    });
  };

  const fetchData = async (): Promise<
    [State, ProseMirrorState, Uint8Array]
  > => {
    // let args = await remote.getArgs().catch(() => undefined);
    let args;
    // const state: State = unwrap(store);
    const state: State = store;

    if (!isTauri) {
      const room = window.location.pathname?.slice(1).trim();
      args = { room: room ? room : undefined };
    }
    const data = await db.get('state');
    console.log(';; 读取idb数据 ', data);

    let parsed: any;
    if (data !== undefined) {
      try {
        parsed = JSON.parse(data);
      } catch (err) {
        throw new ServiceError('invalid_state', data);
      }
    }

    if (!parsed) {
      return [{ ...state, args }, undefined, undefined];
    }

    const config = { ...state.config, ...parsed.config };
    if (!isConfig(config)) {
      throw new ServiceError('invalid_config', config);
    }

    let text: any;
    if (parsed.text) {
      if (!isText(parsed.text)) {
        throw new ServiceError('invalid_state', parsed.text);
      }

      text = parsed.text;
    }

    const newState = {
      ...parsed,
      config,
      args,
    };

    if (newState.lastModified) {
      newState.lastModified = new Date(newState.lastModified);
    }

    for (const file of parsed.files) {
      if (!isFile(file)) {
        throw new ServiceError('invalid_file', file);
      }

      if (file.ydoc && typeof file.ydoc === 'string') {
        file.ydoc = toUint8Array(file.ydoc);
      }
    }

    if (!isState(newState)) {
      throw new ServiceError('invalid_state', newState);
    }

    let ydoc;
    if (parsed.ydoc && typeof parsed.ydoc === 'string') {
      ydoc = toUint8Array(parsed.ydoc);
    }

    return [newState, text, ydoc];
  };

  const getTheme = (state: State, force = false) => {
    const matchDark = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = matchDark.matches;
    const update = force || !state.config.theme;
    if (update && isDark && !isDarkTheme(state.config)) {
      return { theme: 'dark', codeTheme: 'material-dark' };
    } else if (update && !isDark && isDarkTheme(state.config)) {
      return { theme: 'light', codeTheme: 'material-light' };
    }

    return {};
  };

  const clean = () => {
    // disconnectCollab(unwrap(store.collab));
    const state: State = {
      ...getInitialState(),
      args: { cwd: store.args?.cwd },
      loading: 'initialized',
      files: [],
      fullscreen: store.fullscreen,
      lastModified: new Date(),
      error: undefined,
      collab: undefined,
    };
    updateEditorState(state, createEmptyText());
    setState(state);
  };

  const discard = async () => {
    if (store.path || store.collab?.room) {
      await discardText();
    } else if (store.files.length > 0 && isEmpty(store.editorView.state)) {
      await discardText();
    } else if (isEmpty(store.editorView?.state)) {
      newFile();
    } else {
      selectAll(store.editorView.state, store.editorView.dispatch);
      deleteSelection(store.editorView.state, store.editorView.dispatch);
    }

    store.editorView?.focus();
  };

  const setError = (error: Error) => {
    console.error(error);
    if (error instanceof ServiceError) {
      setState({ ...store, error: error.errorObject, loading: 'initialized' });
    } else {
      setState({
        ...store,
        error: { id: 'exception', props: { error } },
        loading: 'initialized',
      });
    }
  };

  /** 💡 初始化会从indexeddb读取数据  */
  const init = async () => {
    try {
      const result = await fetchData();
      // 本地开发时返回数组只有第一个有值
      console.log(';; init-fetch ', result);

      let data = result[0];
      let text = result[1];
      const ydoc = result[2];
      if (data.collab?.room || data.args.room) {
        data = doStartCollab(data, undefined, ydoc);
      } else if (data.args.text) {
        data = await doOpenFile(data, { text: JSON.parse(data.args.text) });
      } else if (data.args.file) {
        const file = await loadFile(data.config, data.args.file);
        data = await doOpenFile(data, file);
        text = file.text;
      } else if (data.path) {
        const file = await loadFile(data.config, data.path);
        data = await doOpenFile(data, file);
        text = file.text;
      }

      const newState: State = {
        // ...unwrap(store),
        ...store,
        ...data,
        config: { ...data.config, ...getTheme(data) },
        loading: 'initialized',
      };

      if (isTauri && newState.config?.alwaysOnTop) {
        // remote.setAlwaysOnTop(true);
      }

      updateEditorState(newState, text ?? createEmptyText());
      setState(newState);
    } catch (error) {
      setError(error);
    }
  };

  const loadFile = async (config: Config, path: string): Promise<File> => {
    try {
      // const fileContent = await remote.readFile(path);
      const fileContent = '## test markdown 内容';
      // const lastModified = await remote.getFileLastModified(path);
      const lastModified = new Date();
      const schema = createSchema({
        config,
        markdown: false,
        path,
        keymap,
      });

      const parser = createMarkdownParser(schema);
      const doc = parser.parse(fileContent).toJSON();
      const text = {
        doc,
        selection: {
          type: 'text',
          anchor: 1,
          head: 1,
        },
      };

      return {
        text,
        lastModified: lastModified.toISOString(),
        path: path,
      };
    } catch (e) {
      throw new ServiceError('file_permission_denied', { error: e });
    }
  };

  const newFile = () => {
    const empty = isEmpty(store.editorView?.state);
    // const state: State = unwrap(store);
    const state: State = store;
    let files = state.files;
    if (!state.error && !empty && !store.path) {
      files = addToFiles(files, state);
    }

    const update = {
      ...state,
      args: { cwd: state.args?.cwd },
      files,
      lastModified: undefined,
      path: undefined,
      collab: undefined,
      error: undefined,
    };

    disconnectCollab(state.collab);
    updateEditorState(update, createEmptyText());
    setState(update);
  };

  const openFile = async (file: File) => {
    // const state: State = unwrap(store);
    const state: State = store;
    const update = await doOpenFile(state, file);
    setState(update);
  };

  const doOpenFile = async (state: State, f: File): Promise<State> => {
    const findIndexOfFile = (f: File) => {
      for (let i = 0; i < state.files.length; i++) {
        if (state.files[i] === f) return i;
        else if (f.path && state.files[i].path === f.path) return i;
      }

      return -1;
    };

    const index = findIndexOfFile(f);
    let file = index === -1 ? f : state.files[index];
    let files = state.files.filter((f) => f !== file);

    if (!isEmpty(state.editorView?.state) && state.lastModified) {
      files = addToFiles(files, state);
    }

    if (!file.text && file?.path) {
      file = await loadFile(state.config, file.path);
    }

    const next: Partial<State> = {
      lastModified: file.lastModified ? new Date(file.lastModified) : undefined,
      path: file.path,
      markdown: file.markdown,
      ...(file.collab?.room ? { collab: { room: file.collab.room } } : {}),
    };

    let newState: State = {
      ...state,
      args: { cwd: state.args?.cwd },
      files,
      collab: undefined,
      error: undefined,
      ...next,
    };

    disconnectCollab(state.collab);
    newState = doStartCollab(newState, undefined, file.ydoc);
    updateEditorState(newState, file.text ?? createEmptyText());
    return newState;
  };

  const saveState = debounce(async (state: State) => {
    if (!state.editorView) {
      return;
    }

    const data: any = {
      lastModified: state.lastModified,
      files: state.files,
      config: state.config,
      path: state.path,
      markdown: state.markdown,
      collab: {
        room: state.collab?.room,
      },
    };

    if (state.path) {
      const text = serialize(store.editorView.state);
      // await remote.writeFile(state.path, text);
    } else if (state.collab?.room) {
      const documentState = Y.encodeStateAsUpdate(state.collab.y.provider.doc);
      data.ydoc = fromUint8Array(documentState);
    } else {
      data.text = store.editorView.state.toJSON();
    }

    db.set('state', JSON.stringify(data));
  }, 200);

  const setAlwaysOnTop = (alwaysOnTop: boolean) => {
    // remote.setAlwaysOnTop(alwaysOnTop);
    // setState('config', { alwaysOnTop });
  };

  const setFullscreen = (fullscreen: boolean) => {
    // remote.setFullscreen(fullscreen);
    // setState({ fullscreen });
  };

  const shouldBackup = (state: State, ydoc?: Uint8Array) => {
    return (
      state.path ||
      (state.args?.room &&
        state.collab?.room !== state.args.room &&
        (!isEmpty(state.editorView?.state) || ydoc))
    );
  };

  const startCollab = () => {
    // const state: State = unwrap(store);
    const state: State = store;
    const update = doStartCollab(state, uuidv4());
    updateEditorState(update);
    setState(update);
  };

  const onCollabConfigUpdate = (event: any) => {
    const font = event.target.get('font') as string;
    const fontSize = event.target.get('fontSize') as number;
    const contentWidth = event.target.get('contentWidth') as number;
    // setState('config', { font, fontSize, contentWidth });
  };

  const doStartCollab = (
    state: State,
    newRoom?: string,
    savedDoc?: Uint8Array,
  ): State => {
    const room = newRoom ?? state.args?.room ?? state.collab?.room;
    if (!room) return state;

    window.history.replaceState(null, '', `/${room}`);

    let ydoc = new Y.Doc();
    try {
      if (room === state.collab?.room && savedDoc) {
        Y.applyUpdate(ydoc, savedDoc);
      } else if (state.editorView) {
        ydoc = prosemirrorToYDoc(state.editorView.state.doc);
      }
    } catch (error) {
      setError(error);
    }

    const prosemirrorType = ydoc.getXmlFragment('prosemirror');
    const provider = new WebsocketProvider(COLLAB_URL, room, ydoc);
    const configType = ydoc.getMap('config');
    configType.set('font', state.config.font);
    configType.set('fontSize', state.config.fontSize);
    configType.set('contentWidth', state.config.contentWidth);
    configType.observe(onCollabConfigUpdate);

    const xs = Object.values(themes);
    const index = Math.floor(Math.random() * xs.length);
    const username = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      style: 'capital',
      separator: ' ',
      length: 2,
    });

    provider.awareness.setLocalStateField('user', {
      name: username,
      background: xs[index].primaryBackground,
      foreground: xs[index].primaryForeground,
    });

    let newState = state;
    if (shouldBackup(state, savedDoc)) {
      let files = state.files;
      if (!state.error) {
        files = addToFiles(files, state, savedDoc);
      }

      newState = {
        ...newState,
        files,
        lastModified: undefined,
        path: undefined,
        error: undefined,
      };
    }

    return {
      ...newState,
      collab: {
        started: true,
        room,
        y: { prosemirrorType, configType, provider },
      },
    };
  };

  const disconnectCollab = (collab?: Collab) => {
    collab?.y?.provider.destroy();
    collab?.y?.configType.unobserve(onCollabConfigUpdate);
    window.history.replaceState(null, '', '/');
  };

  const toggleMarkdown = () => {
    // const state: State = unwrap(store);
    const state: State = store;
    const editorState = store.editorView.state;
    const markdown = !state.markdown;
    const selection = { type: 'text', anchor: 1, head: 1 };
    let doc: any;

    if (markdown) {
      const lines = serialize(editorState).split('\n');
      const nodes = lines.map((text) => {
        return text
          ? { type: 'paragraph', content: [{ type: 'text', text }] }
          : { type: 'paragraph' };
      });

      doc = { type: 'doc', content: nodes };
    } else {
      const schema = createSchema({
        config: state.config,
        path: state.path,
        y: state.collab?.y,
        markdown,
        keymap,
      });

      const parser = createMarkdownParser(schema);
      let textContent = '';
      editorState.doc.forEach((node: any) => {
        textContent += `${node.textContent}\n`;
      });
      const text = parser.parse(textContent);
      doc = text.toJSON();
    }

    updateEditorState({ ...state, markdown }, { selection, doc });
    setState({ ...store, markdown });
  };

  const updateConfig = (conf: Partial<Config>) => {
    // const state: State = unwrap(store);
    const state: State = store;
    if (conf.font) state.collab?.y?.configType.set('font', conf.font);
    if (conf.fontSize)
      state.collab?.y?.configType.set('fontSize', conf.fontSize);
    if (conf.contentWidth)
      state.collab?.y?.configType.set('contentWidth', conf.contentWidth);
    const config = { ...state.config, ...conf };
    updateEditorState({ ...state, config });
    // setState({ config, lastModified: new Date() });
  };

  const updatePath = (path: string) => {
    // setState({ path, lastModified: new Date() });
  };

  const updateTheme = () => {
    // setState('config', getTheme(unwrap(store), true));
  };

  /** 💡 创建pme-EditorView 实际执行 */
  const createEditorView = (elem: HTMLElement) => {
    const { text, extensions } = initialEditorState;
    const { editorState, nodeViews } = createEditorState(text, extensions);

    let editorView: EditorView | undefined;

    const dispatchTransaction = (tr: Transaction) => {
      // console.log(';; tr ', editorView, tr);
      if (!editorView) return;
      const newState = editorView.state.apply(tr);
      editorView.updateState(newState);
      if (!tr.docChanged) return;
      setState({ ...store, lastModified: new Date() });
    };

    editorView = new EditorView(elem, {
      state: editorState,
      nodeViews,
      dispatchTransaction,
    });
    applyDevTools(editorView, { devToolsExpanded: true });

    setState({ ...store, editorView });
    setTimeout(() => editorView.focus());
  };

  /** 更新原理是通过 EditorState.fromJSON 重新创建 */
  const updateEditorState = (state: State, text?: ProseMirrorState) => {
    const extensions = createExtensions({
      config: state.config ?? store.config,
      markdown: state.markdown ?? store.markdown,
      path: state.path ?? store.path,
      keymap,
      ...(state.collab?.y?.prosemirrorType ? { y: state.collab.y } : {}),
    });
    // Save text and extensions for first render
    if (!state.editorView) {
      // initialEditorState.text = text;
      // initialEditorState.extensions = extensions;
      setInitialEditorState({ text, extensions });
      // 👉🏻 首次初始化时editorState对象并没有创建，而是在createEditorView中创建
      return;
    } else {
      // delete initialEditorState.text;
      // delete initialEditorState.extensions;
      setInitialEditorState({
        ...initialEditorState,
        text: undefined,
        extensions: undefined,
      });
    }
    const t = text ?? store.editorView.state;
    const { editorState, nodeViews } = createEditorState(
      t,
      extensions,
      store.editorView.state,
    );
    store.editorView.setProps({ state: editorState, nodeViews });
    store.editorView.focus();
  };

  /** 会返回编辑器状态与操作编辑器的方法 */
  const ctrl = {
    clean,
    discard,
    init,
    loadFile,
    newFile,
    openFile,
    saveState,
    setAlwaysOnTop,
    setFullscreen,
    setState,
    startCollab,
    toggleMarkdown,
    updateConfig,
    updatePath,
    updateTheme,
    createEditorView,
    updateEditorState,
  };

  return [store, ctrl] as const;
};

/** 💡 创建 pme-EditorState 实际执行，基于`EditorState.fromJSON`实现
 * - 会从extensions中收集 schema、nodeViews、plugins
 */
const createEditorState = (
  text: ProseMirrorState,
  extensions: ProseMirrorExtension[],
  prevText?: EditorState,
): {
  editorState: EditorState;
  nodeViews: { [key: string]: NodeViewConstructor };
} => {
  const reconfigure = text instanceof EditorState && prevText?.schema;
  let schemaSpec = { nodes: {} };
  let nodeViews = {};
  let plugins = [];
  console.log(';; createEdiState-reconfigure ', reconfigure);

  for (const extension of extensions) {
    if (extension.schema) {
      schemaSpec = extension.schema(schemaSpec);
    }

    if (extension.nodeViews) {
      nodeViews = { ...nodeViews, ...extension.nodeViews };
    }
  }

  const schema = reconfigure ? prevText?.schema : new Schema(schemaSpec);
  for (const extension of extensions) {
    if (extension.plugins) {
      plugins = extension.plugins(plugins, schema);
    }
  }

  let editorState: EditorState;
  if (reconfigure) {
    editorState = text.reconfigure({ plugins });
  } else if (text instanceof EditorState) {
    editorState = EditorState.fromJSON({ schema, plugins }, text.toJSON());
  } else {
    // 首次初始化编辑器时执行这里
    editorState = EditorState.fromJSON({ schema, plugins }, text);
  }

  return { editorState, nodeViews };
};
