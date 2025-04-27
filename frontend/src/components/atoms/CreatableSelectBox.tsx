import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import { ControllerProps, FieldValues } from 'react-hook-form/dist/types';
import { FieldError } from 'react-hook-form/dist/types/errors';
import CreatableSelect from 'react-select/creatable';
import { CreatableProps } from 'react-select/dist/declarations/src/Creatable';
import { GroupBase } from 'react-select/dist/declarations/src/types';

export type SearchableSelectOptions =
  {
    value: string | number;
    label: string;
  };

export type ComboBoxInputProps<Option extends SearchableSelectOptions> = {
  validationError?: FieldError;
  options: Option[];
};


export function CreatableSelectBox<FormProps extends FieldValues = FieldValues, Option extends SearchableSelectOptions = SearchableSelectOptions>({
  className,
  options,
  validationError,
  controllerProps,
  onCreateOption,
  ...props
}: ComboBoxInputProps<Option>
  & Omit<CreatableProps<Option, false, GroupBase<Option>>, 'onCreateOption'>
  & { controllerProps: Omit<ControllerProps<FormProps>, 'render'>; onCreateOption: (inputValue: string) => void | Promise<void> })
  : JSX.Element {

  const [errorDisplay, setErrorDisplay] = useState('');

  async function errorWrappedCreate(inputValue: string): Promise<void> {
    try {
      await onCreateOption(inputValue);
    } catch(error) {
    }
  }

  return (
    <>
      <Controller<FormProps>
        {...controllerProps}
        render={({
          field: { onChange, value, ref },
        }) =>
          (
            <CreatableSelect<Option>
              {...props}
              ref={ref}
              className={`block w-full disabled:bg-gray-100 disabled:cursor-not-allowed ${className ?? ''}`}
              options={options}
              value={options.filter(o => o.value === value)}
              onChange={val => onChange(val?.value)}
              menuPosition={'fixed'}
              menuPlacement={'bottom'}
              onCreateOption={errorWrappedCreate}
              styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
            />
          )}
      />
    </>
  );
}