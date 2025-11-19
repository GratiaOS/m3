import React from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import './placeholders.css';

type BaseProps = {
  id: string;
  label: string;
  hint?: string;
  className?: string;
  inputClassName?: string;
  as?: 'input' | 'textarea';
  tint?: 'none' | 'ask' | 'true';
};

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'placeholder' | 'className'> & { as?: 'input' };

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'placeholder' | 'className'> & { as: 'textarea' };

type FieldProps = InputProps | TextareaProps;

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export const Field = React.forwardRef<FieldElement, FieldProps>((props, forwardedRef) => {
  const { id, label, hint, className, inputClassName, as = 'input', tint = 'none', ...rest } = props as FieldProps;

  const containerClass = ['field', className].filter(Boolean).join(' ');
  const controlClass = ['field-input', 'halo', inputClassName].filter(Boolean).join(' ');

  if (as === 'textarea') {
    const textareaProps = rest as TextareaHTMLAttributes<HTMLTextAreaElement>;
    return (
      <div className={containerClass} data-tint={tint}>
        <textarea
          id={id}
          ref={forwardedRef as React.ForwardedRef<HTMLTextAreaElement>}
          placeholder=" "
          data-halo
          className={controlClass}
          {...textareaProps}
        />
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {hint ? (
          <span className="field-hint" aria-hidden="true">
            {hint}
          </span>
        ) : null}
      </div>
    );
  }

  const inputProps = rest as InputHTMLAttributes<HTMLInputElement>;

  return (
      <div className={containerClass} data-tint={tint}>
        <input
          id={id}
          ref={forwardedRef as React.ForwardedRef<HTMLInputElement>}
        placeholder=" "
        data-halo
        className={controlClass}
        {...inputProps}
      />
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <span className="field-hint" aria-hidden="true">
          {hint}
        </span>
      ) : null}
    </div>
  );
});

Field.displayName = 'Field';
