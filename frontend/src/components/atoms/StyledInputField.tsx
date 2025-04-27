import React, { Ref } from 'react';
import { FieldError } from 'react-hook-form/dist/types/errors';

export type InputFieldProps = Omit<JSX.IntrinsicElements['input'], 'ref'> & {
  id?: string;
  validationError?: FieldError;
};

function _StyledInputField({ id, className, validationError, ...props }: InputFieldProps, ref: Ref<HTMLInputElement>): JSX.Element {
  return (<>
    <input {...props} id={id} ref={ref}
      className={`appearance-none block w-full px-3 py-2 border text-base rounded-md shadow-sm 
        placeholder-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed max-w-full
        ${className ?? ''} ${validationError ? 'outline-errorPrimary ring-errorPrimary border-errorPrimary' : 'border-gray-300'}`}
    />
    {validationError && <span className={'text-errorPrimary text-sm'}>{validationError.message}</span>}
  </>);
}

const StyledInputField = React.forwardRef(_StyledInputField);
export default StyledInputField;
