import { AlgorithmParameter } from "../../../types";
import React, { useState } from "react";
import Toggle from "components/atoms/Toggle";
import { QuestionMarkCircleIcon } from "@heroicons/react/20/solid";

function isNumeric(str: any): boolean {
  if(typeof str != "string") return false;
  return !isNaN(Number(str)) && !isNaN(parseFloat(str));
}

export default function AlgorithmSettingsInput(
  { paramSettings, updateFunction, name }:
    { paramSettings: AlgorithmParameter; updateFunction: (value: string | number | boolean | null) => void; name: string },
): JSX.Element {
  const [inputValue, setInputValue] = useState<string | number | boolean | null>(paramSettings.value);
  const [error, setError] = useState("");
  const validateNumericInput = (input?: string): void => {
    if(input === undefined || input.trim() === "") {
      if(paramSettings.optional) {
        setInputValue("");
        updateFunction(null);
      } else {
        setError("Field must not be empty!");
        setInputValue("");
      }
    } else if(!isNumeric(input)) {
      setError("Number must not contain non-numeric characters!");
      setInputValue(input);
    } else {
      const num = parseFloat(input);
      if(paramSettings.type === "integer" && num % 1 !== 0) setError("Number must be an integer.");
      else if(paramSettings.max != null && paramSettings.max < num) setError(`Number exceeds maximum of ${paramSettings.max}`);
      else if(paramSettings.min != null && paramSettings.min > num) setError(`Number does not comply with minimum of ${paramSettings.min}`);
      else {
        setError("");
        updateFunction(num);
      }
      setInputValue(input);
    }
  };

  return <div className="w-full flex flex-col col-span-2 gap-x-5 indigo-slider ">
    {(paramSettings.type === "integer" || paramSettings.type === "float" || paramSettings.type === "enum") &&<div className="flex flex-row gap-2">
      <span className="text-gray-600 font-semibold text-sm">{name}</span>
      <div className="group relative">
        <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />
        <div className="hidden group-hover:block absolute bottom-4 left-1/2 -translate-x-1/2 w-[300px] bg-white text-black rounded-lg shadow-lg p-4">
          {paramSettings.description}
        </div>
      </div>
    </div>}
    {(paramSettings.type === "integer" || paramSettings.type === "float") &&
      <input
        type="number"
        value={inputValue as string}
        onChange={e => validateNumericInput(e.target.value)}
        step={1} className={`border-none outline-none bg-gray-100 text-black rounded-lg focus:ring-0 focus:ring-offset-0`}
      />
    }
    {paramSettings.type === "boolean" && <div className="flex flex-row gap-3">
      <p className="text-gray-600 font-semibold text-sm">{name}</p>
      <div className="group relative">
        <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400"/>
        <div className="hidden group-hover:block absolute bottom-4 left-1/2 -translate-x-1/2 w-[300px] bg-white text-black rounded-lg shadow-lg p-4">
          {paramSettings.description}
        </div>
      </div>
      <Toggle enabled={inputValue as boolean} setEnabled={(checked: boolean) => {
        setInputValue(checked);
        updateFunction(checked);
      }}/>
    </div>}
    {paramSettings.type === "enum" &&
      <select
        value={inputValue as string}
        onChange={e => {
          setInputValue(e.target.value);
          updateFunction(e.target.value);
        }}
        className="border-none outline-none bg-gray-100 text-black rounded-lg focus:ring-0 focus:ring-offset-0"
      >
        {paramSettings.values?.map(val => <option key={val}>{val}</option>)}
      </select>}
    <div className="flex flex-col justify-center items-start gap-x-5">
      {paramSettings.optional && <p className="text-gray-700">Optional</p>}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  </div>;
}