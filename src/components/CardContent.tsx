import * as React from 'react';

export const CardContent = ({ text = '', children }) => {
  return (
    <div>
      <h4>内容头部000000000</h4>
      <p>{text}</p>
      {children}
    </div>
  );
};
