import { useState } from 'react';

export const Tooltip = ({ children, content }) => {
  const [show, setShow] = useState(false);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && <div className="tooltip-content">{content}</div>}
    </div>
  );
};
