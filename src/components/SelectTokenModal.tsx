import { useRef } from 'react';
import styled from 'styled-components';
import { IModalProps } from '../types';
import SelectTokenContainer from './SelectTokenContainer';

const Dialog = styled.dialog`
  border: none;
  border-radius: ${({ theme }) => theme.borderRadius};
  padding: 0;
  background: transparent;
  box-shadow: none;
  box-sizing: border-box;

  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
  }
`;

const SelectTokenModal = (props: IModalProps) => {
  const { children } = props;
  const modalRef = useRef<HTMLDialogElement>(null);

  const openModal = () => {
    modalRef.current?.showModal();
  };

  const closeModal = () => {
    modalRef.current?.close();
  };

  return (
    <>
      <div onClick={openModal}>{children}</div>
      <Dialog ref={modalRef}>
        <SelectTokenContainer {...props} closeModal={closeModal} />
      </Dialog>
    </>
  );
};

export default SelectTokenModal;