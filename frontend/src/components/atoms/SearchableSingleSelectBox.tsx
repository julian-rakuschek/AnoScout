import React from 'react';
import { Controller } from 'react-hook-form';
import { ControllerProps, FieldValues } from 'react-hook-form/dist/types';
import Select, { Props as SelectProps } from 'react-select';
import { FieldError } from "react-hook-form/dist/types/errors";

export type SearchableSelectOptions =
  {
    value: string | number;
    label: string;
  };

export type ComboBoxInputProps<Option extends SearchableSelectOptions> = {
  validationError?: FieldError;
  options: Option[];
};

export function SearchableSingleSelectBox<FormProps extends FieldValues = FieldValues, Option extends SearchableSelectOptions = SearchableSelectOptions>({
  className,
  options,
  validationError,
  controllerProps,
  ...props
}: ComboBoxInputProps<Option> & SelectProps<Option, false> & { controllerProps: Omit<ControllerProps<FormProps>, 'render'> }): JSX.Element {

  return (
    <>
      <Controller<FormProps>
        {...controllerProps}
        render={({
          field: { onChange, value, ref },
        }) => (
          <Select<Option>
            {...props}
            ref={ref}
            className={`block w-full disabled:bg-gray-100 disabled:cursor-not-allowed ${className ?? ''}`}
            options={options}
            value={options.filter(o => o.value === value)}
            onChange={val => onChange(val?.value)}
            menuPosition={'fixed'}
            menuPlacement={'bottom'}
            styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
          />
        )}
      />
    </>
  );
}
