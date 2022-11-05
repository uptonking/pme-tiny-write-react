import React, { useEffect } from 'react';

import { css, injectGlobal } from '@emotion/css';

import { TinyEditor } from '../components/Editor';
import { Layout } from '../components/Layout';
import { useGlobalContext } from '../context';
import { insertImage } from '../prosemirror/extension/image';
import { useEffectOnce } from '../utils/hooks/use-effect-once';
import { fonts } from './config';
import { isTauri } from './env';

// import ErrorView from '../components/Error';
// import Menu from '../components/Menu';
// import { State, StateContext } from './state';
// import { createCtrl } from './ctrl';
// import * as remote from './remote';
// import { Show, createEffect, onCleanup, onError, onMount, untrack, } from 'solid-js';
// import { createMutable, unwrap } from 'solid-js/store';
// import { listen } from '@tauri-apps/api/event';
// import { convertFileSrc } from '@tauri-apps/api/tauri';

const fontsStyles = Object.entries(fonts)
  .filter(([, value]) => value.src)
  .map(([, value]) => ({
    '@font-face': {
      fontFamily: `'${value.label}'`,
      src: `url('${value.src}')`,
    },
  }));

// injectGlobal(fontsStyles);

// export const MainApp = (props: { state: State }) => {
export const MainApp = () => {
  // const [store, ctrl] = createCtrl(props.state);
  const store = useGlobalContext((v) => v.store);
  const ctrl = useGlobalContext((v) => v.ctrl);

  // const mouseEnterCoords = createMutable({ x: 0, y: 0 });

  // const onDragOver = (e: any) => {
  //   mouseEnterCoords.x = e.pageX;
  //   mouseEnterCoords.y = e.pageY;
  // };

  const insertImageMd = (editorView, data, left, top) => {
    if (store.markdown) {
      const text = `![](${data})`;
      const pos = editorView.posAtCoords({ left, top });
      const tr = editorView.state.tr;
      tr.insertText(text, pos?.pos ?? editorView.state.doc.content.size);
      editorView.dispatch(tr);
    } else {
      insertImage(store.editorView, data, left, top);
    }
  };

  // onMount(async () => {
  //   if (store.error) return;
  //   await ctrl.init();
  // });
  // console.log(';; Main-render');
  useEffect(() => {
    // console.log(';; Main-effect');

    const initEditorState = async () => {
      if (store.error) return;
      await ctrl.init();
      console.log(';; ctrl.init() ');
    };
    initEditorState();
  }, []);

  // onMount(() => {
  //   const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)');
  //   const onChangeTheme = () => ctrl.updateTheme();
  //   matchDark().addEventListener('change', onChangeTheme);
  //   onCleanup(() => matchDark().removeEventListener('change', onChangeTheme));
  // });
  // useEffectOnce(() => {
  //   const matchDark = () => window.matchMedia('(prefers-color-scheme: dark)');
  //   const onChangeTheme = () => ctrl.updateTheme();
  //   matchDark().addEventListener('change', onChangeTheme);
  //   return () => matchDark().removeEventListener('change', onChangeTheme);
  // });

  // onMount(async () => {
  //   if (!isTauri) return;
  //   const unlisten = await listen('tauri://file-drop', async (event: any) => {
  //     for (const path of event.payload as string[]) {
  //       const mime = await remote.getMimeType(path);
  //       if (mime.startsWith('image/')) {
  //         const x = mouseEnterCoords.x;
  //         const y = mouseEnterCoords.y;
  //         insertImageMd(store.editorView, convertFileSrc(path), x, y);
  //       } else if (mime.startsWith('text/')) {
  //         const state: State = unwrap(store);
  //         const file = await ctrl.loadFile(state.config, path);
  //         await ctrl.openFile(file);
  //         return;
  //       }
  //     }
  //   });
  //   onCleanup(() => unlisten());
  // });

  // onMount(async () => {
  //   if (isTauri) return;
  //   const onDrop = (e) => {
  //     e.preventDefault();
  //     if (e.target.closest('.codemirror-outer')) {
  //       return;
  //     }

  //     for (const file of e.dataTransfer.files) {
  //       if (file.type.startsWith('image/')) {
  //         const x = mouseEnterCoords.x;
  //         const y = mouseEnterCoords.y;
  //         const reader = new FileReader();
  //         reader.readAsDataURL(file);
  //         reader.onloadend = function () {
  //           insertImageMd(store.editorView, reader.result as string, x, y);
  //         };
  //       }
  //     }
  //   };
  //   window.addEventListener('drop', onDrop);
  //   onCleanup(() => {
  //     window.removeEventListener('drop', onDrop);
  //   });
  // });

  // useEffectOnce(() => {
  //   if (isTauri) return;
  //   const onDrop = (e) => {
  //     e.preventDefault();
  //     if (e.target.closest('.codemirror-outer')) {
  //       return;
  //     }

  //     for (const file of e.dataTransfer.files) {
  //       if (file.type.startsWith('image/')) {
  //         const x = mouseEnterCoords.x;
  //         const y = mouseEnterCoords.y;
  //         const reader = new FileReader();
  //         reader.readAsDataURL(file);
  //         reader.onloadend = function () {
  //           insertImageMd(store.editorView, reader.result as string, x, y);
  //         };
  //       }
  //     }
  //   };

  //   window.addEventListener('drop', onDrop);
  //   return () => window.removeEventListener('drop', onDrop);
  // });

  // onError((error) => {
  //   console.error(error);
  //   ctrl.setState({
  //     error: { id: 'exception', props: { error } },
  //   });
  // });

  // createEffect(() => {
  //   if (!store.lastModified) return;
  //   const doc = store.editorView?.state.doc;
  //   const len = doc?.content.size;
  //   if (len > 0) {
  //     const text = doc.textBetween(0, Math.min(30, len), ' ');
  //     document.title = text;
  //   }
  // });

  // ✨ 保存编辑器数据
  // createEffect((prev) => {
  //   const lastModified = store.lastModified;
  //   if (
  //     !lastModified ||
  //     (store.loading === 'initialized' && prev === 'loading')
  //   ) {
  //     return store.loading;
  //   }

  //   const state: State = untrack(() => unwrap(store));
  //   ctrl.saveState(state);
  //   return store.loading;
  // }, store.loading);

  return (
    <Layout
      config={store.config}
      data-testid={store.error ? 'error' : store.loading}
      // onDragOver={onDragOver}
    >
      {/* {store.error ? <ErrorView /> : null} */}
      {store.error ? <h4>ERROR 异常组件</h4> : null}
      {store.loading === 'initialized' ? (
        <>
          {!store.error ? <TinyEditor /> : null}
          {/* <Menu /> */}
          <div
            className={css`
              position: relative;
              flex-shrink: 0;
              flex-grow: 1;
              height: 100%;
              font-family: 'JetBrains Mono ExtraLight';
            `}
          >
            <h6>Menu 菜单组件</h6>
          </div>
        </>
      ) : null}
      {/* <Show when={store.error}>
          <ErrorView />
        </Show>
        <Show when={store.loading === 'initialized'}>
          <Show when={!store.error}>
            <Editor />
          </Show>
          <Menu />
        </Show> */}
    </Layout>
  );
};
