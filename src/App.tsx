import './index.scss';

import * as React from 'react';

import { MainApp } from './common/Main';
import { newState } from './common/state';
import { GlobalProvider } from './context';

export const App = () => {
  return (
    <div>
      <h1>Hello, 世界 202208 </h1>
      <GlobalProvider initialData={newState()}>
        <MainApp />
      </GlobalProvider>
    </div>
  );
};

export default App;
