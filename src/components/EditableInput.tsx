import React, { useState, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

interface EditableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  registerProps: any;
}

export function EditableInput({ label, error, registerProps, className, ...props }: EditableInputProps) {
  const [isEditable, setIsEditable] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { ref, ...restRegister } = registerProps;

  const handlePencilClick = () => {
    setIsEditable(true);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="relative">
        <input
          {...restRegister}
          ref={(e) => {
            ref(e);
            inputRef.current = e;
          }}
          readOnly={!isEditable}
          className={cn(
            "w-full px-4 py-3 rounded-xl border transition-all duration-200 outline-none",
            !isEditable ? "bg-gray-50 text-gray-600 border-gray-200" : "bg-white focus:ring-2 focus:ring-gray-900/10 shadow-sm",
            error ? "border-red-300 focus:border-red-500" : "border-gray-200 focus:border-gray-900",
            className
          )}
          {...props}
        />
        {!isEditable && (
          <button
            type="button"
            onClick={handlePencilClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Modifier"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
