// @ts-nocheck
import { createColorsArray } from "lib/helper/color";
import { interpolateWarm } from "d3-scale-chromatic";
import Select, { CSSObjectWithLabel, SingleValue, StylesConfig } from "react-select";
import chroma from "chroma-js";

export interface ColourOption {
  readonly value: string;
  readonly label: string;
  readonly color: string;
}

const dot = (color = "transparent"): CSSObjectWithLabel => ({
  alignItems: "center",
  display: "flex",

  ":before": {
    backgroundColor: color,
    borderRadius: 10,
    content: '" "',
    display: "block",
    marginRight: 8,
    height: 10,
    width: 10,
  },
});

const colourStylesBase: StylesConfig<ColourOption> = {
  control: styles => ({ ...styles, backgroundColor: "white" }),
  option: (styles, { data, isDisabled, isFocused, isSelected }) => {
    const color = chroma(data.color);
    return {
      ...styles,
      backgroundColor: isDisabled
        ? undefined
        : isSelected
          ? data.color
          : isFocused
            ? color.alpha(0.1).css()
            : undefined,
      color: isDisabled
        ? "#ccc"
        : isSelected
          ? chroma.contrast(color, "white") > 2
            ? "white"
            : "black"
          : data.color,
      cursor: isDisabled ? "not-allowed" : "default",

      ":active": {
        ...styles[":active"],
        backgroundColor: !isDisabled
          ? isSelected
            ? data.color
            : color.alpha(0.3).css()
          : undefined,
      },
    };
  },
};

const colourStylesSingle: StylesConfig<ColourOption, false> = {
  ...colourStylesBase,
  input: styles => ({ ...styles, ...dot() }),
  placeholder: styles => ({ ...styles, ...dot("#ccc") }),
  singleValue: (styles, { data }) => ({ ...styles, ...dot(data.color) }),
};

export default function ChannelSelection({ selectableChannels, selectedChannel, setSelectedChannel }: {
  selectableChannels: string[];
  selectedChannel: string;
  setSelectedChannel: (channel: string) => void;
}): JSX.Element {
  const colors = createColorsArray(selectableChannels.length, { start: 0, end: 1, reverse: false, interpolateFunc: interpolateWarm });
  const options: ColourOption[] = selectableChannels.map((c, i) => {
    return { value: c, label: c, color: colors[i] };
  });


  return <div className="flex flex-row justify-center gap-x-3 flex-wrap">
    <Select
      closeMenuOnSelect={true}
      defaultValue={[options[0]]}
      isMulti={false}
      options={options}
      value={options.filter(option => selectedChannel === option.value)}
      placeholder={"Select a channel"}
      onChange={(new_options: SingleValue<ColourOption>) => setSelectedChannel(new_options !== null ? (new_options as SingleValue<ColourOption>).value : null)}
      styles={colourStylesSingle}
      isSearchable={false}
    />
  </div>;
}