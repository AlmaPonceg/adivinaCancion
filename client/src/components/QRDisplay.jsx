import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';

export default function QRDisplay({ value, size = 200 }) {
  if (!value) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 18 }}
      className="qr-container"
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#F0EBE3"
        fgColor="#111113"
        level="H"
        includeMargin={false}
      />
    </motion.div>
  );
}
