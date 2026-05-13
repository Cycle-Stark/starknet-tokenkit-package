import { useRef, useCallback, useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { IModalProps } from '../types';
import SelectTokenContainer from './SelectTokenContainer';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }
`;

const backdropFadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const backdropFadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

const Dialog = styled.dialog<{ closing?: boolean }>`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius}px;
  padding: 0;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;
  font-family: ${({ theme }) => theme.fonts.fontFamily || `"Geist", "Inter", sans-serif`};
  animation: ${({ closing }) => closing ? fadeOut : fadeIn} 0.2s ease-out forwards;

  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    animation: ${({ closing }) => closing ? backdropFadeOut : backdropFadeIn} 0.2s ease-out forwards;
  }
`;

const SelectTokenModal = (props: IModalProps) => {
  const { children } = props;
  const modalRef = useRef<HTMLDialogElement>(null);
  const [isClosing, setIsClosing] = useState(false);

  const openModal = useCallback(() => {
    setIsClosing(false);
    modalRef.current?.showModal();
  }, []);

  const closeModal = useCallback(() => {
    setIsClosing(true);
    // Wait for animation to finish before actually closing
    setTimeout(() => {
      modalRef.current?.close();
      setIsClosing(false);
    }, 180);
  }, []);

  // Click-outside-to-close: clicks on the dialog element (backdrop area) but not its children
  const handleDialogClick = useCallback((e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === modalRef.current) {
      closeModal();
    }
  }, [closeModal]);

  // Close on Escape (native dialog already does this, but we need to intercept for animation)
  useEffect(() => {
    const dialog = modalRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault(); // Prevent instant close
      closeModal();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [closeModal]);

  return (
    <>
      <div onClick={openModal}>{children}</div>
      <Dialog ref={modalRef} closing={isClosing} onClick={handleDialogClick}>
        <SelectTokenContainer {...props} closeModal={closeModal} />
      </Dialog>
    </>
  );
};

export default SelectTokenModal;
