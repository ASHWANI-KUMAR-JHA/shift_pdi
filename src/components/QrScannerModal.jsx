import { useEffect, useRef, useState } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import './QrScannerModal.css';

// A full-screen friendly QR/barcode scanner. Opens the device camera (prefers
// the rear camera on phones), decodes the first code it sees, and hands the
// decoded text back via onResult. Designed to feel at home on mobile.
function QrScannerModal({ title = 'Scan code', onResult, onClose }) {
  const regionId = useRef(`qr-region-${Math.random().toString(36).slice(2)}`);
  const scannerRef = useRef(null);
  const resolvedRef = useRef(false);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const html5 = new Html5Qrcode(regionId.current, { verbose: false });
    scannerRef.current = html5;

    const config = {
      fps: 10,
      qrbox: (vw, vh) => {
        const size = Math.floor(Math.min(vw, vh) * 0.7);
        return { width: size, height: size };
      },
      aspectRatio: 1.0,
    };

    const handleSuccess = (decodedText) => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      // Stop before reporting so the camera light turns off immediately.
      html5
        .stop()
        .catch(() => {})
        .finally(() => {
          if (!cancelled) onResult(String(decodedText || '').trim());
        });
    };

    html5
      .start({ facingMode: 'environment' }, config, handleSuccess, () => {})
      .then(() => {
        if (!cancelled) setStatus('scanning');
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Could not start the camera. Make sure no other app is using it.'
        );
      });

    return () => {
      cancelled = true;
      const inst = scannerRef.current;
      if (inst) {
        inst
          .stop()
          .catch(() => {})
          .finally(() => {
            try { inst.clear(); } catch { /* ignore */ }
          });
      }
    };
  }, [onResult]);

  return (
    <div className="qr-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="qr-head">
          <h3>{title}</h3>
          <button type="button" className="qr-close" onClick={onClose} aria-label="Close scanner">
            <X size={20} />
          </button>
        </div>

        <div className="qr-viewport">
          <div id={regionId.current} className="qr-region" />
          {status === 'starting' && (
            <div className="qr-status">
              <Loader2 size={28} className="qr-spin" />
              <span>Starting camera…</span>
            </div>
          )}
          {status === 'error' && (
            <div className="qr-status qr-status-error">
              <AlertCircle size={28} />
              <span>{error}</span>
            </div>
          )}
          {status === 'scanning' && <div className="qr-frame" aria-hidden="true" />}
        </div>

        <p className="qr-hint">
          {status === 'scanning'
            ? 'Point the camera at the QR code or barcode.'
            : status === 'error'
              ? 'Close and try again once camera access is granted.'
              : 'Please wait…'}
        </p>
      </div>
    </div>
  );
}

export default QrScannerModal;
