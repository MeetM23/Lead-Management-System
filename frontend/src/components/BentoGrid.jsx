import React from 'react';
import clsx from 'clsx';

const BentoGrid = ({ children, className }) => {
  return (
    <div
      className={clsx(
        'grid grid-cols-1 md:grid-cols-12 gap-6 [grid-auto-rows:160px] md:[grid-auto-rows:180px]',
        className
      )}
    >
      {children}
    </div>
  );
};

export default BentoGrid;
