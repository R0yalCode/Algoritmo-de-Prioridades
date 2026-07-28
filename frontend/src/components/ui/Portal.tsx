import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  children: ReactNode;
}

export default function Portal({ children }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);

  if (!elRef.current) {
    elRef.current = document.createElement('div');
    elRef.current.setAttribute('data-portal', '');
  }

  useEffect(() => {
    const el = elRef.current!;
    document.body.appendChild(el);
    return () => { document.body.removeChild(el); };
  }, []);

  return createPortal(children, elRef.current);
}
