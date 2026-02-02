import React from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

const variants = {
  light: 'bento-card',
  dark: 'bento-card-dark',
  blue: 'bento-card-blue',
  green: 'bento-card-green',
  warm: 'bento-card-warm',
  glass: 'rounded-3xl p-6 md:p-8 bg-white/30 backdrop-blur-xl border border-white/30',
};

const BentoCard = ({ children, variant = 'light', span = '', className, onClick }) => {
  const MotionDiv = motion.div;
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -100px 0px' }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      whileHover={{ scale: 1.01 }}
      className={clsx('bento-item', variants[variant], span, 'cursor-default', className)}
      onClick={onClick}
    >
      {children}
    </MotionDiv>
  );
};

export default BentoCard;
