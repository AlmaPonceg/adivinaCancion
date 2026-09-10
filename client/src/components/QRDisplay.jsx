import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

export default function QRDisplay({ value, size = 180 }) {
  if (!value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-slate-200/80"
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#FFFFFF"
        fgColor="#0F172A"
        level="M"
        includeMargin={true}
      />
    </motion.div>
  );
}
