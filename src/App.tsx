import './index.scss';

import * as React from 'react';

import { MainApp } from './common/Main';
import { getInitialState } from './common/state';
import { GlobalProvider } from './context';

export const App = () => {
  return (
    <div>
      <h1>Hello, 世界 202208 </h1>
      <GlobalProvider initialState={getInitialState()}>
        <MainApp />
      </GlobalProvider>
    </div>
  );
};

export default App;
